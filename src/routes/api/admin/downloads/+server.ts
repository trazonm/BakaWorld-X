// Admin endpoint for fetching all user downloads
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { getUsers } from '$lib/server/userModel';
import type { JwtPayload } from 'jsonwebtoken';
import type { Download } from '$lib/types';

const allowedUsers = ['bakaboi341'].map(u => u.toLowerCase());

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
	if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
		return session.username;
	}
	return null;
}

interface DownloadWithUser extends Download {
	username: string;
	userId: number;
}

export const GET: RequestHandler = async ({ request }) => {
	const session = getSessionUser(request);
	const username = getUsernameFromSession(session);
	
	// Check if user is admin
	if (!username || !allowedUsers.includes(username.toLowerCase())) {
		return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), { status: 403 });
	}

	// Get all users and their downloads
	const users = await getUsers();
	const allDownloads: DownloadWithUser[] = [];

	for (const dbUser of users) {
		const downloads = Array.isArray(dbUser.downloads) ? dbUser.downloads : [];
		for (const download of downloads) {
			allDownloads.push({
				...download,
				username: dbUser.username,
				userId: dbUser.id
			});
		}
	}

	// Sort by most recent first (if we have a timestamp, otherwise by id)
	allDownloads.sort((a, b) => {
		// Try to sort by id (which might be timestamp-based) or just keep order
		return b.id.localeCompare(a.id);
	});

	return new Response(JSON.stringify({
		downloads: allDownloads,
		totalDownloads: allDownloads.length,
		uniqueUsers: new Set(allDownloads.map(d => d.username)).size
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};

