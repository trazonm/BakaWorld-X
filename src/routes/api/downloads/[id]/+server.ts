// SvelteKit endpoint for managing user downloads (CRUD)
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, deleteDownloadById } from '$lib/server/userModel';
import type { JwtPayload } from 'jsonwebtoken';
import { REAL_DEBRID_AUTH } from '$env/static/private';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
  if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
    return session.username;
  }
  return null;
}

function getRealDebridHeaders() {
  // Replace with your actual logic to get the Real-Debrid API key/token
  return {
    Authorization: `Bearer ${REAL_DEBRID_AUTH}`
  };
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
  await deleteDownloadById(user.username, id);


  try {
    const res = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/delete/${id}`,
      {
        method: 'DELETE',
        headers: getRealDebridHeaders()
      }
    );
    if (!res.ok) {
      console.error('Failed to delete from Real-Debrid:', await res.text());
      return new Response(JSON.stringify({ error: 'Failed to delete from Real-Debrid' }), { status: 502 });
    }
  } catch (err) {
    console.error('Error deleting from Real-Debrid:', err);
    return new Response(JSON.stringify({ error: 'Error contacting Real-Debrid' }), { status: 502 });
  }
  
  console.log(`Successfully deleted torrent with id: ${id} for user: ${username}`);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
