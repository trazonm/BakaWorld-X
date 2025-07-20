// SvelteKit endpoint for managing user downloads (CRUD)
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, updateUserDownloads } from '$lib/server/userModel';
import type { JwtPayload } from 'jsonwebtoken';

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
  if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
    return session.username;
  }
  return null;
}

export const GET: RequestHandler = async ({ request }) => {
	const session = getSessionUser(request);
	const username = getUsernameFromSession(session);
	if (!username) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}
	const user = await findUserByUsername(username);
	if (!user) {
		return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
	}
	return new Response(JSON.stringify(user.downloads.reverse() || []), { status: 200 });
};

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
	const { id, filename, progress, link } = await request.json();
	const downloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
	const index = downloads.findIndex((d: any) => d.id === id);
	const newDownload = { id, filename, progress, link };
	if (index !== -1) {
		downloads[index] = newDownload;
	} else {
		downloads.push(newDownload);
	}
	await updateUserDownloads(user.username, downloads);
	return new Response(JSON.stringify({ success: true }), { status: 200 });
};
