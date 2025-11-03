// Comic issue pages endpoint using readcomicsonline.ru scraper
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createComicScraperService } from '$lib/services/comicScraperService';

export const GET: RequestHandler = async ({ request, params, url }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const issueId = params.issueId;
    const comicSlug = url.searchParams.get('comic');
    
    if (!issueId) {
        return new Response(JSON.stringify({ error: 'Issue ID is required' }), { status: 400 });
    }
    
    if (!comicSlug) {
        return new Response(JSON.stringify({ error: 'Comic slug is required as query parameter' }), { status: 400 });
    }
    
    try {
        const scraperService = createComicScraperService();
        const result = await scraperService.getComicPages(comicSlug, issueId);
        
        if (result.pages.length === 0) {
            return new Response(JSON.stringify({ 
                error: 'No pages available for this issue',
                note: 'The comic pages may not be available or the page structure may have changed.'
            }), { status: 404 });
        }
        
        return new Response(JSON.stringify(result), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Comic issue pages error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
};
