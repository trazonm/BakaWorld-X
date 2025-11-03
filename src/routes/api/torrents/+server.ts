// Real-Debrid torrents list endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';

export const GET: RequestHandler = async () => {
	const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
    try {
        const torrents = await realDebridService.getTorrents();
        
        return new Response(JSON.stringify(torrents), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get torrents';
        console.error('Get torrents error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }), 
            { status: 500 }
        );
    }
};

