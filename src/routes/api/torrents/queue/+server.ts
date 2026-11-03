// Background queue endpoint - handles adding torrents and immediately tracking them
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, mutateDownloads } from '$lib/server/userModel';
import { grabProwlarrRelease, rewriteJackettLink } from '$lib/server/releaseSearch';
import { addNzbFromUrl } from '$lib/server/sabnzbd';
import {
	createRealDebridService,
	RealDebridService,
	UnknownResourceError,
	torrentDownloadLinkNeedsUnrestrict
} from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';
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
		const { magnetLink, link, title, guid, protocol, grab } = await request.json();
		
		if (!magnetLink && !link && protocol !== 'usenet') {
			return new Response(JSON.stringify({ error: 'Magnet link or torrent link is required' }), { status: 400 });
		}

		if (protocol === 'usenet') {
			const prowlarrUrl = (env.PROWLARR_URL || process.env.PROWLARR_URL || '').replace(/\/$/, '');
			const prowlarrApiKey = env.PROWLARR_API_KEY || process.env.PROWLARR_API_KEY || '';
			if (!prowlarrUrl || !prowlarrApiKey) {
				return new Response(JSON.stringify({ error: 'Prowlarr is not configured' }), { status: 500 });
			}
			const grabBody = grab && typeof grab === 'object' ? grab : { guid, title, downloadUrl: link, protocol: 'usenet' };
			const downloadUrl = typeof grabBody.downloadUrl === 'string' && grabBody.downloadUrl
				? grabBody.downloadUrl
				: typeof link === 'string'
					? link
					: '';
			process.env.SABNZBD_URL = env.SABNZBD_URL || process.env.SABNZBD_URL || '';
			process.env.SABNZBD_API_KEY = env.SABNZBD_API_KEY || process.env.SABNZBD_API_KEY || '';
			const sabConfigured = Boolean(process.env.SABNZBD_URL && process.env.SABNZBD_API_KEY);
			let sabId = '';
			if (sabConfigured && downloadUrl) {
				sabId = await addNzbFromUrl(downloadUrl, String(title || grabBody.title || 'release'));
			} else {
				await grabProwlarrRelease(prowlarrUrl, prowlarrApiKey, grabBody);
			}
			const usenetId = sabId ? `usenet:${sabId}` : `usenet:${String(guid || title || Date.now())}`;
			await mutateDownloads(user.username, (downloads) => {
				const entry = {
					id: usenetId,
					filename: title || grabBody.title || 'Usenet download',
					progress: sabId ? 0 : 100,
					status: sabId ? 'Queued' : 'sent',
					link: '',
					guid: guid || '',
					protocol: 'usenet',
					sabId,
					added: new Date().toISOString()
				};
				const index = downloads.findIndex((item) => item.id === usenetId);
				const next = [...downloads];
				if (index === -1) next.push(entry);
				else next[index] = { ...next[index], ...entry, added: next[index].added || entry.added };
				return { downloads: next, result: entry };
			});
			return new Response(JSON.stringify({ success: true, id: usenetId, existing: false, protocol: 'usenet', progress: sabId ? 0 : 100 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
		const realDebridService = createRealDebridService(realDebridAuth);
		const jackettUrl = env.JACKETT_URL || process.env.JACKETT_URL || '';
		let linkToUse = rewriteJackettLink(magnetLink || link, jackettUrl);

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

		let downloadEntry = {
			id: torrentId,
			filename: torrentInfo.filename || title || 'Unknown',
			progress: typeof torrentInfo.progress === 'number' ? torrentInfo.progress : 0,
			status: torrentInfo.status || 'queued',
			link: torrentInfo.links?.[0] || '',
			hash: torrentInfo.hash || '',
			guid: guid || '',
			protocol: 'torrent',
			misses: 0,
			added: new Date().toISOString()
		};

		await mutateDownloads(user.username, (downloads) => {
			const index = downloads.findIndex((item) => item.id === torrentId);
			const next = [...downloads];
			if (index === -1) next.push(downloadEntry);
			else next[index] = { ...next[index], ...downloadEntry, added: next[index].added || downloadEntry.added };
			return { downloads: next };
		});

		// Send database notification to trigger immediate worker poll (real-time trigger)
		try {
			const { query } = await import('$lib/server/db');
			// Send notification with username as payload for potential future filtering
			await query(`SELECT pg_notify('new_download', $1)`, [user.username]);
		} catch (notifyError) {
			// Don't fail the request if notification fails - worker will still poll
			console.warn('Failed to send database notification:', notifyError);
		}

		// Immediately poll this download to update its status (handles edge case where browser closes)
		// This ensures the worker picks it up even if the user exits immediately
		try {
			// Only poll if it's a new torrent (not already complete)
			if (!existingTorrent || torrentInfo.progress < 100) {
				// Give Real-Debrid a moment to process the new torrent (500ms)
				await new Promise(resolve => setTimeout(resolve, 500));
				
				try {
					const currentInfo = await realDebridService.getTorrentInfo(torrentId);
					
					// Update if there are changes
					if (
						currentInfo.progress !== downloadEntry.progress ||
						currentInfo.status !== downloadEntry.status ||
						currentInfo.filename !== downloadEntry.filename ||
						(currentInfo.links?.[0] && currentInfo.links[0] !== downloadEntry.link)
					) {
						let resolvedLink = currentInfo.links?.[0] || downloadEntry.link || '';
						if (
							currentInfo.progress >= 100 &&
							currentInfo.links?.[0] &&
							torrentDownloadLinkNeedsUnrestrict(downloadEntry.link, currentInfo.links[0])
						) {
							try {
								const unrestricted = await realDebridService.unrestrictLink(currentInfo.links[0]);
								resolvedLink = unrestricted.download || unrestricted.link;
							} catch (unrestrictError) {
								console.warn(`Failed to unrestrict link for ${torrentId}:`, unrestrictError);
							}
						}
						await mutateDownloads(user.username, (downloads) => {
							const downloadIndex = downloads.findIndex((item) => item.id === torrentId);
							if (downloadIndex === -1) return { downloads };
							const updatedDownload = {
								...downloads[downloadIndex],
								progress:
									typeof currentInfo.progress === 'number'
										? currentInfo.progress
										: downloads[downloadIndex].progress,
								status: currentInfo.status || downloads[downloadIndex].status,
								filename: currentInfo.filename || downloads[downloadIndex].filename,
								link: resolvedLink || downloads[downloadIndex].link || '',
								speed: currentInfo.speed,
								seeders: currentInfo.seeders,
								misses: 0
							};
							const next = [...downloads];
							next[downloadIndex] = updatedDownload;
							return { downloads: next, result: updatedDownload };
						});
						torrentInfo = currentInfo;
					}
				} catch (pollError) {
					// If torrent doesn't exist yet (too soon after adding), that's OK
					// The worker will pick it up on the next cycle
					if (!(pollError instanceof UnknownResourceError)) {
						console.warn(`Initial poll failed for ${torrentId}:`, pollError);
					}
				}
			}
		} catch (immediatePollError) {
			// Don't fail the request if immediate polling fails
			// The worker will pick it up on the next cycle
			console.warn(`Immediate poll error for ${torrentId}:`, immediatePollError);
		}

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

