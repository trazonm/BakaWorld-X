import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';

const allowedUsers = ['bakaboi341', 'im_james420', 'limeking', 'wizkid'];

export const load: PageServerLoad = async ({ request }) => {
	const user = getSessionUser(request);
	const username =
		typeof user === 'string'
			? user
			: typeof user === 'object' && user
			? (user as any).username ?? (user as any).user
			: undefined;

	if (!username || !allowedUsers.includes(username)) {
		throw error(403, 'Access denied.');
	}

	return {};
};

