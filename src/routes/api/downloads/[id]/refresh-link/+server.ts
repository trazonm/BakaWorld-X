import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, updateUserDownloads } from '$lib/server/userModel';
import { createRealDebridService, UnknownResourceError } from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';
import type { JwtPayload } from 'jsonwebtoken';

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
	if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
		return session.username;
	}
	return null;
}

export const POST: RequestHandler = async ({ request, params }) => {
	const session = getSessionUser(request);
	const username = getUsernameFromSession(session);
	if (!username) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const user = await findUserByUsername(username);
	if (!user) {
		return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
	}

	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
	}

	const downloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
	const index = downloads.findIndex((d: any) => d.id === id);
	if (index === -1) {
		return new Response(JSON.stringify({ error: 'Download not found' }), { status: 404 });
	}

	const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
	const realDebridService = createRealDebridService(realDebridAuth);

	try {
		const torrentInfo = await realDebridService.getTorrentInfo(id);
		const apiLink = torrentInfo.links?.[0];
		if (!apiLink) {
			return new Response(
				JSON.stringify({ error: 'Real-Debrid has no file link for this torrent yet' }),
				{ status: 400 }
			);
		}
		const unrestricted = await realDebridService.unrestrictLink(apiLink);
		const link = unrestricted.download || unrestricted.link;
		if (!link) {
			return new Response(JSON.stringify({ error: 'Unrestrict returned no URL' }), { status: 502 });
		}

		downloads[index] = { ...downloads[index], link };
		await updateUserDownloads(user.username, downloads);

		return new Response(JSON.stringify({ success: true, link }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		if (err instanceof UnknownResourceError) {
			return new Response(JSON.stringify({ error: 'Torrent no longer exists on Real-Debrid' }), {
				status: 404
			});
		}
		const message = err instanceof Error ? err.message : 'Failed to refresh link';
		console.error('refresh-link:', message);
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
