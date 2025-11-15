// Admin endpoint for deleting any user's download
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, deleteDownloadById } from '$lib/server/userModel';
import type { JwtPayload } from 'jsonwebtoken';
import { createRealDebridService } from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const allowedUsers = ['bakaboi341'].map(u => u.toLowerCase());

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
	if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
		return session.username;
	}
	return null;
}

export const DELETE: RequestHandler = async ({ request, params }) => {
	const session = getSessionUser(request);
	const username = getUsernameFromSession(session);
	
	// Check if user is admin
	if (!username || !allowedUsers.includes(username.toLowerCase())) {
		return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), { status: 403 });
	}

	const { id } = params;
	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing id param' }), { status: 400 });
	}

	// Get the target username from request body
	let targetUsername: string;
	try {
		const body = await request.json().catch(() => ({}));
		targetUsername = body.username;
		if (!targetUsername) {
			return new Response(JSON.stringify({ error: 'Missing username in request body' }), { status: 400 });
		}
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
	}

	// Find the target user
	const targetUser = await findUserByUsername(targetUsername);
	if (!targetUser) {
		return new Response(JSON.stringify({ error: 'Target user not found' }), { status: 404 });
	}

	// Verify the download exists for this user
	const downloads = Array.isArray(targetUser.downloads) ? targetUser.downloads : [];
	const downloadExists = downloads.some((d: any) => d.id === id);
	if (!downloadExists) {
		return new Response(JSON.stringify({ error: 'Download not found for this user' }), { status: 404 });
	}

	console.log(`Admin ${username} deleting torrent ${id} for user ${targetUsername}`);
	
	// Delete from database first
	await deleteDownloadById(targetUser.username, id);

	// Then delete from Real-Debrid
	try {
		const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
		const realDebridService = createRealDebridService(realDebridAuth);
		await realDebridService.deleteTorrent(id);
		console.log(`Successfully deleted torrent from Real-Debrid: ${id}`);
	} catch (err: any) {
		// If it's a 204 response or deletion succeeded, that's fine
		if (err.message?.includes('204') || err.message?.includes('No Content')) {
			console.log(`Torrent deleted from Real-Debrid (204 response): ${id}`);
		} else {
			console.error('Error deleting from Real-Debrid:', err);
			// Don't fail the request - we already deleted from DB
		}
	}
	
	console.log(`Successfully deleted torrent with id: ${id} for user: ${targetUsername} by admin: ${username}`);
	return new Response(JSON.stringify({ success: true }), { status: 200 });
};

