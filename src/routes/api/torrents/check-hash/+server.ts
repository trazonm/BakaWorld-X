// Real-Debrid check torrent by hash endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService, RealDebridService } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
    try {
        const { magnetLink, hash } = await request.json();
        
        let torrentHash = hash;
        
        // Extract hash from magnet link if not provided
        if (!torrentHash && magnetLink) {
            torrentHash = RealDebridService.extractHashFromMagnet(magnetLink);
        }
        
        if (!torrentHash) {
            return new Response(
                JSON.stringify({ error: 'Hash or magnet link with hash is required' }), 
                { status: 400 }
            );
        }

        const existingTorrents = await realDebridService.checkTorrentsByHash(torrentHash);
        
        // Find the best match: prefer completed torrents, then by newest
        const bestTorrent = existingTorrents.length > 0 
            ? existingTorrents.sort((a, b) => {
                // Prefer completed torrents
                if (a.progress === 100 && b.progress !== 100) return -1;
                if (b.progress === 100 && a.progress !== 100) return 1;
                // Then prefer newer (by added date)
                return new Date(b.added).getTime() - new Date(a.added).getTime();
            })[0]
            : null;
        
        return new Response(JSON.stringify({ 
            exists: existingTorrents.length > 0,
            torrent: bestTorrent,
            allTorrents: existingTorrents, // Return all matches
            count: existingTorrents.length
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to check torrent hash';
        console.error('Check torrent hash error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }), 
            { status: 500 }
        );
    }
};

