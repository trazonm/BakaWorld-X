// Real-Debrid delete torrent endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';

export const DELETE: RequestHandler = async ({ params }) => {
	const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
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
