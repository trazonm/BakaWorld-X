// Background queue endpoint - handles adding torrents and immediately tracking them
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, updateUserDownloads } from '$lib/server/userModel';
import { createRealDebridService, RealDebridService } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';
import type { JwtPayload } from 'jsonwebtoken';
import { Buffer } from 'node:buffer';

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
  if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
    return session.username;
  }
  return null;
}

export const POST: RequestHandler = async ({ request }) => {
	const session = getSessionUser(request);
	const username = getUsernameFromSession(session);
	if (!username) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const user = await findUserByUsername(username);
	if (!user) {
		return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
	}

	try {
		const { magnetLink, link, title, guid } = await request.json();
		
		if (!magnetLink && !link) {
			return new Response(JSON.stringify({ error: 'Magnet link or torrent link is required' }), { status: 400 });
		}

		const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
		let linkToUse = magnetLink || link;

		// Apply the same link conversion as handleLink
		const baseUrl = 'https://jackett-service.gleeze.com';
		linkToUse = linkToUse.replace(/http:\/\/192\.168\.0\.107:9117/g, baseUrl);

		// Check if torrents already exist by hash (only for magnet links)
		let existingTorrent = null;
		if (magnetLink) {
			const hash = RealDebridService.extractHashFromMagnet(magnetLink);
			if (hash) {
				const existingTorrents = await realDebridService.checkTorrentsByHash(hash);
				if (existingTorrents.length > 0) {
					// Select best: prefer completed, then newest
					existingTorrent = existingTorrents.sort((a, b) => {
						if (a.progress === 100 && b.progress !== 100) return -1;
						if (b.progress === 100 && a.progress !== 100) return 1;
						return new Date(b.added).getTime() - new Date(a.added).getTime();
					})[0];
					
					if (existingTorrents.length > 1) {
						console.log(`Found ${existingTorrents.length} existing torrents with same hash, using best: ${existingTorrent.id}`);
					}
				}
			}
		}

		let torrentId: string;
		let torrentInfo: any;

		if (existingTorrent) {
			// Use existing torrent
			torrentId = existingTorrent.id;
			torrentInfo = existingTorrent;
		} else {
			// Add new torrent - use same logic as handleLink
			if (linkToUse.includes('magnet') || linkToUse.startsWith('magnet:')) {
				// Direct magnet link
				const result = await realDebridService.addMagnet(linkToUse);
				torrentId = result.id;
				torrentInfo = result;
			} else {
				// Handle torrent file link - follow redirects first
				let finalUrl = linkToUse;
				try {
					// Check for redirects (same logic as getRedirectUrl)
					const checkResponse = await fetch(linkToUse, { redirect: 'manual' });
					if ([301, 302, 307, 308].includes(checkResponse.status)) {
						const redirectLocation = checkResponse.headers.get('location');
						if (redirectLocation) {
							finalUrl = redirectLocation;
						}
					}
				} catch (redirectError) {
					// If redirect check fails, try direct fetch
					console.warn('Redirect check failed, using original URL:', redirectError);
				}

				// Check if redirect resulted in magnet link
				if (finalUrl.includes('magnet')) {
					const result = await realDebridService.addMagnet(finalUrl);
					torrentId = result.id;
					torrentInfo = result;
				} else {
					// Fetch torrent file
					const fileResponse = await fetch(finalUrl);
					if (!fileResponse.ok) {
						throw new Error(`Failed to fetch torrent file: ${fileResponse.statusText} (${fileResponse.status})`);
					}
					const arrayBuffer = await fileResponse.arrayBuffer();
					const torrentBuffer = Buffer.from(arrayBuffer);
					const result = await realDebridService.addTorrent(torrentBuffer);
					torrentId = result.id;
					torrentInfo = result;
				}
			}
		}

		// Immediately save to database
		const downloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
		const existingIndex = downloads.findIndex((d: any) => d.id === torrentId);
		
		const downloadEntry = {
			id: torrentId,
			filename: torrentInfo.filename || title || 'Unknown',
			progress: torrentInfo.progress || 0,
			status: torrentInfo.status || 'queued',
			link: torrentInfo.links?.[0] || '',
			hash: torrentInfo.hash || '',
			guid: guid || '',
			added: new Date().toISOString()
		};

		if (existingIndex !== -1) {
			downloads[existingIndex] = downloadEntry;
		} else {
			downloads.push(downloadEntry);
		}

		await updateUserDownloads(user.username, downloads);

		return new Response(JSON.stringify({
			success: true,
			id: torrentId,
			existing: !!existingTorrent,
			torrent: torrentInfo
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to add torrent to queue';
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error('Queue error:', errorMessage);
		console.error('Queue error stack:', errorStack);
		console.error('Queue error details:', error);
		return new Response(
			JSON.stringify({ 
				error: errorMessage,
				details: errorStack ? errorStack.split('\n').slice(0, 5).join('\n') : undefined
			}),
			{ status: 500 }
		);
	}
};

