// Session helper
// Extract and verify session JWT from cookies
import { verifyJwt } from '$lib/server/jwt';

/**
 * Extracts and verifies the session JWT from the request cookies.
 * Returns the user payload if valid, or null if not authenticated.
 */
export function getSessionUser(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  const payload = verifyJwt(match[1]);
  return payload || null;
}
