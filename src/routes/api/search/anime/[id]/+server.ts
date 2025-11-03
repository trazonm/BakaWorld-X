// Anime info endpoint using Consumet API
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createConsumetService } from '$lib/services/consumetService';
import { config } from '$lib/config';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ request, params }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const animeId = params.id;
    if (!animeId) {
        return new Response(JSON.stringify({ error: 'Anime ID is required' }), { status: 400 });
    }
    
    try {
        const baseUrl = config.consumet.baseUrl;
        const consumetService = createConsumetService(baseUrl);
        const data = await consumetService.getAnimeInfo(animeId, 'zoro');
        
        return new Response(JSON.stringify(data), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Anime info error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
};
