// Real-Debrid torrent file endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No torrent file provided' }), 
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const torrentBuffer = Buffer.from(arrayBuffer);
        
        const result = await realDebridService.addTorrent(torrentBuffer);
        
        return new Response(JSON.stringify(result), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add torrent';
        console.error('Torrent add error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }), 
            { status: 500 }
        );
    }
};
