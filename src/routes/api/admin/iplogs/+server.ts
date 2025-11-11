// Optional admin endpoint to view IP logs
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { getAllIpLogs } from '$lib/server/ipLogModel';

// List of admin usernames
const allowedUsers = ['bakaboi341'].map(u => u.toLowerCase());

export const GET: RequestHandler = async ({ request }) => {
  const user = getSessionUser(request);
  const username = typeof user === 'string' 
    ? user.toLowerCase() 
    : typeof user === 'object' && user 
      ? ((user as any).username ?? (user as any).user)?.toLowerCase() 
      : undefined;

  if (!username || !allowedUsers.includes(username)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  try {
    const logs = await getAllIpLogs();
    return new Response(JSON.stringify({ logs, count: logs.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching IP logs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch logs' }), { status: 500 });
  }
};

