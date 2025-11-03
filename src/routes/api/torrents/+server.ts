// Real-Debrid torrents list endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService } from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
	const realDebridService = createRealDebridService(realDebridAuth);
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

