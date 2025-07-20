// SvelteKit endpoint for authentication (login/signup/session)
import type { RequestHandler } from '@sveltejs/kit';
const COOKIE_NAME = 'session';

// Logout endpoint
export const POST: RequestHandler = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure`
    }
  });
};
