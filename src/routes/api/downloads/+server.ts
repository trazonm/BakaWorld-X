// SvelteKit endpoint for managing user downloads (CRUD)
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, mutateDownloads } from '$lib/server/userModel';
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
	const downloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
	return new Response(JSON.stringify(downloads.reverse()), { status: 200 });
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
	const body = await request.json();
	const { id } = body;
	if (!id) {
		return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
	}
	const mergeKeys = [
		'filename',
		'progress',
		'link',
		'status',
		'speed',
		'seeders',
		'hash',
		'guid',
		'added',
		'protocol',
		'misses'
	] as const;
	await mutateDownloads(user.username, (downloads) => {
		const index = downloads.findIndex((item) => item.id === id);
		const existing = index !== -1 ? { ...downloads[index] } : {};
		for (const key of mergeKeys) {
			if (key in body) {
				(existing as Record<string, unknown>)[key] = body[key];
			}
		}
		const next = [...downloads];
		if (index !== -1) next[index] = { ...existing, id };
		else next.push({ ...existing, id });
		return { downloads: next };
	});
	return new Response(JSON.stringify({ success: true }), { status: 200 });
};
