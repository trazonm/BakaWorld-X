// De-duplicate downloads by hash
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { findUserByUsername, updateUserDownloads, deleteDownloadById } from '$lib/server/userModel';
import { createRealDebridService, UnknownResourceError } from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';
import type { JwtPayload } from 'jsonwebtoken';

function getUsernameFromSession(session: string | JwtPayload | null): string | null {
  if (session && typeof session === 'object' && 'username' in session && typeof session.username === 'string') {
    return session.username;
  }
  return null;
}

export const POST: RequestHandler = async ({ request }) => {
  const session = getSessionUser(request);
  const username = getUsernameFromSession(session);
  if (!username) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  try {
    const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
    const realDebridService = createRealDebridService(realDebridAuth);
    const downloads = Array.isArray(user.downloads) ? [...user.downloads] : [];
    
    // Map to store hash -> array of downloads with that hash
    const hashToDownloads = new Map<string, Array<{ download: any; torrentInfo: any; id: string }>>();
    
    // For each download, get its hash from Real-Debrid API
    for (const download of downloads) {
      if (!download.id) {
        continue; // Skip downloads without Real-Debrid ID
      }
      
      try {
        // Get torrent info from Real-Debrid to get the hash
        const torrentInfo = await realDebridService.getTorrentInfo(download.id);
        const hash = torrentInfo.hash?.toLowerCase().trim();
        
        if (!hash) {
          console.warn(`No hash found for torrent ${download.id}`);
          continue;
        }
        
        if (!hashToDownloads.has(hash)) {
          hashToDownloads.set(hash, []);
        }
        
        hashToDownloads.get(hash)!.push({
          download,
          torrentInfo,
          id: download.id
        });
      } catch (error) {
        if (error instanceof UnknownResourceError) {
          // Torrent doesn't exist in Real-Debrid anymore - skip it
          console.log(`Torrent ${download.id} not found in Real-Debrid, will be removed`);
          continue;
        }
        console.error(`Error getting torrent info for ${download.id}:`, error);
        // Continue with other downloads even if one fails
      }
    }
    
    // For each hash group, keep only the most recent (by `added` date from Real-Debrid)
    const downloadsToDelete: string[] = [];
    const downloadsToKeep: any[] = [];
    
    hashToDownloads.forEach((downloadsWithHash, hash) => {
      if (downloadsWithHash.length <= 1) {
        // No duplicates, keep it
        downloadsToKeep.push(downloadsWithHash[0].download);
        return;
      }
      
      // Sort by `added` date (most recent first)
      const sorted = downloadsWithHash.sort((a, b) => {
        const aDate = new Date(a.torrentInfo.added || 0).getTime();
        const bDate = new Date(b.torrentInfo.added || 0).getTime();
        return bDate - aDate; // Most recent first
      });
      
      // Keep the most recent one
      downloadsToKeep.push(sorted[0].download);
      
      // Mark all others for deletion
      for (let i = 1; i < sorted.length; i++) {
        downloadsToDelete.push(sorted[i].id);
      }
    });
    
    // Also keep downloads that weren't in any hash group (no hash found, etc.)
    const keptIds = new Set(downloadsToKeep.map(d => d.id));
    downloads.forEach(download => {
      if (!keptIds.has(download.id) && !downloadsToDelete.includes(download.id)) {
        downloadsToKeep.push(download);
      }
    });
    
    // Delete duplicates from Real-Debrid and database
    const deletedCount = downloadsToDelete.length;
    for (const id of downloadsToDelete) {
      try {
        // Delete from Real-Debrid
        await realDebridService.deleteTorrent(id);
      } catch (error) {
        // If it's already deleted (unknown_ressource), that's fine
        if (!(error instanceof UnknownResourceError)) {
          console.error(`Error deleting torrent ${id} from Real-Debrid:`, error);
        }
      }
      
      // Delete from database
      try {
        await deleteDownloadById(user.username, id);
      } catch (error) {
        console.error(`Error deleting torrent ${id} from database:`, error);
      }
    }
    
    // Update database with kept downloads
    await updateUserDownloads(user.username, downloadsToKeep);
    
    return new Response(JSON.stringify({
      success: true,
      deletedCount,
      keptCount: downloadsToKeep.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to deduplicate downloads';
    console.error('De-duplication error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

