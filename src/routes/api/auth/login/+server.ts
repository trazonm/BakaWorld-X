// SvelteKit endpoint for authentication (login/signup/session)
import type { RequestHandler } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { signJwt } from '$lib/server/jwt';
import { findUserByUsername } from '$lib/server/userModel';

const COOKIE_NAME = 'session';
// Only use Secure in production (HTTPS required)
const isSecure = process.env.NODE_ENV === 'production' || process.env.HTTPS === 'true';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax' as const, // Use 'lax' for better compatibility, especially in Safari
  path: '/',
  maxAge: 60 * 60 * 24 * 7 // 7 days
};


// Login endpoint
export const POST: RequestHandler = async ({ request }) => {
  const { username, password } = await request.json();
  // Normalize username to lowercase for case-insensitive login
  const normalizedUsername = username.toLowerCase().trim();
  const user = await findUserByUsername(normalizedUsername);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return new Response(JSON.stringify({ success: false, message: 'Invalid credentials' }), { status: 401 });
  }
  const token = signJwt({ username: normalizedUsername });
  
  // Build cookie string with conditional Secure flag
  const cookieParts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    `Path=${COOKIE_OPTIONS.path}`,
    `Max-Age=${COOKIE_OPTIONS.maxAge}`,
    `SameSite=${COOKIE_OPTIONS.sameSite}`
  ];
  if (COOKIE_OPTIONS.secure) {
    cookieParts.push('Secure');
  }
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': cookieParts.join('; ')
    }
  });
};