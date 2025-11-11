import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { getAllIpLogs } from '$lib/server/ipLogModel';

const allowedUsers = ['bakaboi341'].map(u => u.toLowerCase());

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

	try {
		const logs = await getAllIpLogs();
		return {
			logs,
			username
		};
	} catch (err) {
		console.error('Error loading IP logs:', err);
		throw error(500, 'Failed to load IP logs');
	}
};

