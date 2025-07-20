// SvelteKit endpoint for authentication (login/signup/session)
import type { RequestHandler } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { findUserByUsername, createUser } from '$lib/server/userModel';

// Register endpoint
export const POST: RequestHandler = async ({ request }) => {
  const { username, password } = await request.json();
  if (await findUserByUsername(username)) {
    return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400 });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await createUser(username, hashedPassword);
  return new Response(JSON.stringify({ message: 'User registered successfully' }), { status: 201 });
};




