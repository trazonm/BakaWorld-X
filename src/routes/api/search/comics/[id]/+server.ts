// Comic info endpoint using readcomicsonline.ru scraper
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createComicScraperService } from '$lib/services/comicScraperService';

export const GET: RequestHandler = async ({ request, params }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const comicSlug = params.id;
    
    if (!comicSlug) {
        return new Response(JSON.stringify({ error: 'Comic ID is required' }), { status: 400 });
    }
    
    try {
        const scraperService = createComicScraperService();
        const comic = await scraperService.getComicInfo(comicSlug);
        
        return new Response(JSON.stringify(comic), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Comic info error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
};

