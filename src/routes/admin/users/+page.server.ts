import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { getUsers } from '$lib/server/userModel';

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
		const users = await getUsers();
		// Don't send password hashes to the frontend
		const safeUsers = users.map(u => ({
			id: u.id,
			username: u.username
		}));
		
		return {
			users: safeUsers,
			adminUsername: username
		};
	} catch (err) {
		console.error('Error loading users:', err);
		throw error(500, 'Failed to load users');
	}
};

export const actions: Actions = {
	resetPassword: async ({ request }) => {
		const user = getSessionUser(request);
		const username =
			typeof user === 'string'
				? user.toLowerCase()
				: typeof user === 'object' && user
				? ((user as any).username ?? (user as any).user)?.toLowerCase()
				: undefined;

		if (!username || !allowedUsers.includes(username)) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const targetUsername = formData.get('username') as string;
		const newPassword = formData.get('newPassword') as string;

		if (!targetUsername || !newPassword) {
			return fail(400, { error: 'Username and password required' });
		}

		try {
			// Import bcrypt and update user password
			const bcrypt = await import('bcrypt');
			const { query } = await import('$lib/server/db');
			
			const hashedPassword = await bcrypt.hash(newPassword, 10);
			await query(
				'UPDATE users SET password = $1 WHERE LOWER(username) = LOWER($2)',
				[hashedPassword, targetUsername]
			);

			return { success: true, message: `Password reset for ${targetUsername}` };
		} catch (err) {
			console.error('Error resetting password:', err);
			return fail(500, { error: 'Failed to reset password' });
		}
	},

	deleteUser: async ({ request }) => {
		const user = getSessionUser(request);
		const username =
			typeof user === 'string'
				? user.toLowerCase()
				: typeof user === 'object' && user
				? ((user as any).username ?? (user as any).user)?.toLowerCase()
				: undefined;

		if (!username || !allowedUsers.includes(username)) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const targetUsername = formData.get('username') as string;

		if (!targetUsername) {
			return fail(400, { error: 'Username required' });
		}

		// Prevent self-deletion
		if (targetUsername.toLowerCase() === username) {
			return fail(400, { error: 'Cannot delete your own account' });
		}

		try {
			const { query } = await import('$lib/server/db');
			await query('DELETE FROM users WHERE LOWER(username) = LOWER($1)', [targetUsername]);

			return { success: true, message: `User ${targetUsername} deleted` };
		} catch (err) {
			console.error('Error deleting user:', err);
			return fail(500, { error: 'Failed to delete user' });
		}
	}
};

