// SvelteKit endpoint for authentication (login/signup/session)
import type { RequestHandler } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { signJwt } from '$lib/server/jwt';
import { findUserByUsername } from '$lib/server/userModel';
import { env } from '$env/dynamic/private';

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

// Verify reCAPTCHA token with Google
async function verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number; error?: string }> {
  const secretKey = env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY || '';
  
  if (!secretKey) {
    return { success: false, error: 'reCAPTCHA not configured' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`
    });

    const data = await response.json();
    
    if (!data.success) {
      return { success: false, error: 'reCAPTCHA verification failed' };
    }

    // reCAPTCHA v3 returns a score (0.0 - 1.0)
    // 0.0 is very likely a bot, 1.0 is very likely a human
    // Typical threshold is 0.5, but you can adjust based on your needs
    const score = data.score || 0;
    if (score < 0.5) {
      return { success: false, score, error: 'Low reCAPTCHA score' };
    }

    return { success: true, score };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, error: 'reCAPTCHA verification failed' };
  }
}

// Login endpoint
export const POST: RequestHandler = async ({ request }) => {
  const { username, password, recaptchaToken } = await request.json();
  
  // Verify reCAPTCHA token
  if (!recaptchaToken) {
    return new Response(JSON.stringify({ success: false, message: 'reCAPTCHA token required' }), { status: 400 });
  }

  const recaptchaResult = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaResult.success) {
    console.warn('reCAPTCHA failed:', recaptchaResult.error, 'Score:', recaptchaResult.score);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Security verification failed. Please try again.' 
    }), { status: 403 });
  }

  // Normalize username to lowercase for case-insensitive login
  const normalizedUsername = username.toLowerCase().trim();
  const user = await findUserByUsername(normalizedUsername);
  
  // Check if user exists
  if (!user) {
    return new Response(JSON.stringify({ success: false, message: 'Username does not exist' }), { status: 401 });
  }
  
  // Check password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return new Response(JSON.stringify({ success: false, message: 'Incorrect password' }), { status: 401 });
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