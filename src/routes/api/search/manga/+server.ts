// Manga search endpoint using Consumet API
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createConsumetService } from '$lib/services/consumetService';
import { config } from '$lib/config';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ request }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const url = new URL(request.url);
    const query = url.searchParams.get('query')?.trim();
    const provider = url.searchParams.get('provider') || config.consumet.defaultMangaProvider;
    
    if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
    }
    
    try {
        // Use config default (http://192.168.0.107:6000)
        const baseUrl = config.consumet.baseUrl;
        console.log('Manga search - Using base URL:', baseUrl);
        console.log('Manga search - Query:', query, 'Provider:', provider);
        
        const consumetService = createConsumetService(baseUrl);
        // Note: Consumet manga search doesn't support page parameter - it's a path parameter only
        const result = await consumetService.searchManga(query, provider, 1);
        
        return new Response(JSON.stringify(result), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Manga search error:', errorMessage);
        console.error('Error stack:', errorStack);
        return new Response(JSON.stringify({ 
            error: errorMessage,
            details: errorStack
        }), { status: 500 });
    }
};

