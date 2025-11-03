// SvelteKit endpoint for managing user downloads (CRUD)
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, deleteDownloadById } from '$lib/server/userModel';
import type { JwtPayload } from 'jsonwebtoken';
import { createRealDebridService } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
  if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
    return session.username;
  }
  return null;
}

export const DELETE: RequestHandler = async ({ request, params }) => {
  const session = getSessionUser(request);
  const username = getUsernameFromSession(session);
  if (!username) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id param' }), { status: 400 });
  }

  console.log(`Received request to delete torrent with id: ${id}`);
  
  // Delete from database first
  await deleteDownloadById(user.username, id);

  // Then delete from Real-Debrid (this may return 204 No Content)
  try {
    const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
    await realDebridService.deleteTorrent(id);
    console.log(`Successfully deleted torrent from Real-Debrid: ${id}`);
  } catch (err: any) {
    // If it's a 204 response or deletion succeeded, that's fine
    if (err.message?.includes('204') || err.message?.includes('No Content')) {
      console.log(`Torrent deleted from Real-Debrid (204 response): ${id}`);
    } else {
      console.error('Error deleting from Real-Debrid:', err);
      // Don't fail the request - we already deleted from DB
      // The client-side will handle cleanup
    }
  }
  
  console.log(`Successfully deleted torrent with id: ${id} for user: ${username}`);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
