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
        
        // Check if it's a Mangapill API error (502, 503, 504, etc.)
        const isMangapillError = errorMessage.includes('502') || 
                                  errorMessage.includes('503') || 
                                  errorMessage.includes('504') ||
                                  errorMessage.includes('API error: 5');
        
        if (isMangapillError) {
            return new Response(JSON.stringify({ 
                error: 'MANGA_API_DOWN',
                message: 'Mangas seem to be taking a nap right now! 😴 While BakaBoi341 is working their magic to fix things, why not check out some awesome anime or dive into some epic comics?'
            }), { status: 503 });
        }
        
        return new Response(JSON.stringify({ 
            error: errorMessage,
            details: errorStack
        }), { status: 500 });
    }
};

