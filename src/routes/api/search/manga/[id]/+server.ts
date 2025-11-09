// Manga info endpoint using Mangapill API (manga-scrapers)
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { mangapillService } from '$lib/services/mangapillService';

export const GET: RequestHandler = async ({ request, params }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const mangaId = params.id;
    
    if (!mangaId) {
        return new Response(JSON.stringify({ error: 'Manga ID is required' }), { status: 400 });
    }
    
    try {
        console.log('Manga info - Using Mangapill API for ID:', mangaId);
        
        const data = await mangapillService.getMangaInfo(mangaId);
        
        return new Response(JSON.stringify(data), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Manga info error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
};

