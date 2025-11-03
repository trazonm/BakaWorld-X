// SvelteKit endpoint for authentication (login/signup/session)
import type { RequestHandler } from '@sveltejs/kit';
const COOKIE_NAME = 'session';
const isSecure = process.env.NODE_ENV === 'production' || process.env.HTTPS === 'true';

// Logout endpoint
export const POST: RequestHandler = async () => {
  const cookieParts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax'
  ];
  if (isSecure) {
    cookieParts.push('Secure');
  }
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': cookieParts.join('; ')
    }
  });
};
