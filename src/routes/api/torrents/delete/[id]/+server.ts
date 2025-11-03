// Real-Debrid delete torrent endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService } from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';

export const DELETE: RequestHandler = async ({ params }) => {
	const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
	const realDebridService = createRealDebridService(realDebridAuth);
    try {
        const { id } = params;
        
        if (!id) {
            return new Response(
                JSON.stringify({ error: 'Missing torrent id' }), 
                { status: 400 }
            );
        }

        await realDebridService.deleteTorrent(id);
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete torrent';
        console.error('Delete torrent error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }), 
            { status: 500 }
        );
    }
};
