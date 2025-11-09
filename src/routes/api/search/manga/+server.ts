// Manga search endpoint using Mangapill API (manga-scrapers)
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { mangapillService } from '$lib/services/mangapillService';

export const GET: RequestHandler = async ({ request }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const url = new URL(request.url);
    const query = url.searchParams.get('query')?.trim();
    
    if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
    }
    
    try {
        console.log('Manga search - Using Mangapill API');
        console.log('Manga search - Query:', query);
        
        const result = await mangapillService.searchManga(query);
        
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

