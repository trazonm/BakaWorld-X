// Real-Debrid torrent info endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService, UnknownResourceError } from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ params }) => {
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

        const data = await realDebridService.getTorrentInfo(id);
        
        return new Response(JSON.stringify(data), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        // Return 404 for unknown resource errors
        if (error instanceof UnknownResourceError) {
            return new Response(
                JSON.stringify({ error: 'Torrent not found' }), 
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to get torrent info';
        console.error('Torrent info error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};