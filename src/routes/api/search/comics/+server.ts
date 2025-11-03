// Comics search endpoint using readcomicsonline.ru scraper
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createComicScraperService } from '$lib/services/comicScraperService';

export const GET: RequestHandler = async ({ request }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const url = new URL(request.url);
    const query = url.searchParams.get('query')?.trim();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    
    if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
    }
    
    try {
        const scraperService = createComicScraperService();
        const result = await scraperService.searchComics(query, page);
        
        return new Response(JSON.stringify(result), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Comics search error:', errorMessage);
        console.error('Error stack:', errorStack);
        return new Response(JSON.stringify({ 
            error: errorMessage,
            details: errorStack
        }), { status: 500 });
    }
};

