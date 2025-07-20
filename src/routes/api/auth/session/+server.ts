// SvelteKit endpoint for session check
import type { RequestHandler } from '@sveltejs/kit';
import { verifyJwt } from '$lib/server/jwt';

export const GET: RequestHandler = async ({ request }) => {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }
  const token = match[1];
  const payload = verifyJwt(token);
  if (!payload) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }
  return new Response(JSON.stringify({ isLoggedIn: true, user: payload }), { status: 200 });
};



