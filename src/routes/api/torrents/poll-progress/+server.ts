// Background polling endpoint - updates all active torrents progress
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, mutateDownloads } from '$lib/server/userModel';
import {
	createRealDebridService,
	UnknownResourceError,
	torrentDownloadLinkNeedsUnrestrict
} from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';
import {
	applyPollSnapshot,
	isUsenetDownload,
	numericProgress,
	shouldDropMissingTorrent,
	type DownloadRecord
} from '$lib/server/downloadMerge';
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
		const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
		const realDebridService = createRealDebridService(realDebridAuth);
		const downloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
		const updatedDownloads = [];

		// Poll each active download
		for (const download of downloads) {
			try {
				// Only poll downloads that aren't complete
				if (isUsenetDownload(download)) {
					updatedDownloads.push(download);
					continue;
				}
				if (download.progress < 100 && download.id) {
					const torrentInfo = await realDebridService.getTorrentInfo(download.id);
					
					const updatedDownload = {
						...download,
						progress: numericProgress(torrentInfo.progress, numericProgress(download.progress, 0)),
						status: torrentInfo.status || download.status,
						filename: torrentInfo.filename || download.filename,
						link: torrentInfo.links?.[0] || download.link || '',
						speed: torrentInfo.speed,
						seeders: torrentInfo.seeders,
						misses: 0
					};

					// If completed, unrestrict the link
					if (
						torrentInfo.progress >= 100 &&
						torrentInfo.links?.[0] &&
						torrentDownloadLinkNeedsUnrestrict(download.link, torrentInfo.links[0])
					) {
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
					const misses = numericProgress(download.misses, 0) + 1;
					if (!shouldDropMissingTorrent(download, misses)) {
						updatedDownloads.push({ ...download, misses });
						continue;
					}
					console.log(`Torrent ${download.id} missing from Real-Debrid after ${misses} checks, removing`);
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

		const kept = new Set(updatedDownloads.map((item) => item.id));
		const dropIds = new Set(downloads.map((item) => item.id).filter((id: string) => id && !kept.has(id)));
		await mutateDownloads(user.username, (latest) => ({
			downloads: applyPollSnapshot(latest, updatedDownloads as DownloadRecord[], dropIds)
		}));

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

