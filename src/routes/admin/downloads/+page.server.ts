import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { getUsers } from '$lib/server/userModel';
import type { Download } from '$lib/types';

const allowedUsers = ['bakaboi341'].map(u => u.toLowerCase());

interface DownloadWithUser extends Download {
	username: string;
	userId: number;
}

export const load: PageServerLoad = async ({ request }) => {
	const user = getSessionUser(request);
	const username =
		typeof user === 'string'
			? user.toLowerCase()
			: typeof user === 'object' && user
			? ((user as any).username ?? (user as any).user)?.toLowerCase()
			: undefined;

	if (!username || !allowedUsers.includes(username)) {
		throw error(403, 'Access denied.');
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

	return {
		username,
		downloads: allDownloads,
		totalDownloads: allDownloads.length,
		uniqueUsers: new Set(allDownloads.map(d => d.username)).size
	};
};

