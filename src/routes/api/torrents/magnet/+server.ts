// Real-Debrid magnet link endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService } from '$lib/services/realDebridService';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	const realDebridAuth = env.REAL_DEBRID_AUTH || process.env.REAL_DEBRID_AUTH || '';
	const realDebridService = createRealDebridService(realDebridAuth);
    try {
        const { link } = await request.json();
        
        if (!link || !link.startsWith('magnet:')) {
            return new Response(
                JSON.stringify({ error: 'Invalid magnet link provided' }), 
                { status: 400 }
            );
        }

        const result = await realDebridService.addMagnet(link);
        
        return new Response(JSON.stringify(result), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add magnet link';
        console.error('Magnet link error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }), 
            { status: 500 }
        );
    }
};
