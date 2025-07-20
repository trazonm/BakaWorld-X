// SvelteKit endpoint for authentication (login/signup/session)
import type { RequestHandler } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { signJwt } from '$lib/server/jwt';
import { findUserByUsername } from '$lib/server/userModel';

const COOKIE_NAME = 'session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 24 * 7 // 7 days
};


// Login endpoint
export const POST: RequestHandler = async ({ request }) => {
  const { username, password } = await request.json();
  const user = await findUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return new Response(JSON.stringify({ success: false, message: 'Invalid credentials' }), { status: 401 });
  }
  const token = signJwt({ username });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; SameSite=Strict; Secure`
    }
  });
};