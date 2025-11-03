// Background polling endpoint - updates all active torrents progress
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, updateUserDownloads } from '$lib/server/userModel';
import { createRealDebridService, UnknownResourceError } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';
import { deleteDownloadById } from '$lib/server/userModel';
import type { JwtPayload } from 'jsonwebtoken';

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
		const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
		const downloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
		const updatedDownloads = [];

		// Poll each active download
		for (const download of downloads) {
			try {
				// Only poll downloads that aren't complete
				if (download.progress < 100 && download.id) {
					const torrentInfo = await realDebridService.getTorrentInfo(download.id);
					
					const updatedDownload = {
						...download,
						progress: torrentInfo.progress || download.progress,
						status: torrentInfo.status || download.status,
						filename: torrentInfo.filename || download.filename,
						link: torrentInfo.links?.[0] || download.link || '',
						speed: torrentInfo.speed,
						seeders: torrentInfo.seeders
					};

					// If completed, unrestrict the link
					if (torrentInfo.progress >= 100 && torrentInfo.links && torrentInfo.links[0] && !download.link.includes('real-debrid.com')) {
						try {
							const unrestricted = await realDebridService.unrestrictLink(torrentInfo.links[0]);
							updatedDownload.link = unrestricted.download || unrestricted.link;
						} catch (err) {
							console.error(`Failed to unrestrict link for ${download.id}:`, err);
						}
					}

					updatedDownloads.push(updatedDownload);
				} else {
					// Keep completed downloads as-is
					updatedDownloads.push(download);
				}
			} catch (error) {
				// If torrent doesn't exist (unknown_ressource), remove it from database
				if (error instanceof UnknownResourceError) {
					console.log(`Torrent ${download.id} not found in Real-Debrid (unknown_ressource), removing from database`);
					try {
						// Try to delete from Real-Debrid once more to be sure
						await realDebridService.deleteTorrent(download.id);
					} catch (deleteError) {
						// If it still returns unknown_ressource, that's fine - it's already gone
						if (!(deleteError instanceof UnknownResourceError)) {
							console.error(`Error attempting to delete missing torrent ${download.id}:`, deleteError);
						}
					}
					// Remove from database - don't add to updatedDownloads
					try {
						await deleteDownloadById(user.username, download.id);
						console.log(`Removed missing torrent ${download.id} from database`);
					} catch (dbError) {
						console.error(`Error removing torrent ${download.id} from database:`, dbError);
					}
					// Skip adding to updatedDownloads - effectively removes it
					continue;
				}
				// For other errors, keep the download entry but mark as error
				console.error(`Error polling torrent ${download.id}:`, error);
				updatedDownloads.push({
					...download,
					status: 'error'
				});
			}
		}

		// Update database
		await updateUserDownloads(user.username, updatedDownloads);

		return new Response(JSON.stringify({
			success: true,
			count: updatedDownloads.length
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to poll progress';
		console.error('Poll progress error:', errorMessage);
		return new Response(
			JSON.stringify({ error: errorMessage }),
			{ status: 500 }
		);
	}
};

