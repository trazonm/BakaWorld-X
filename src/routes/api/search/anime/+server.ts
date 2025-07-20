// SvelteKit endpoint for searching torrents via Jackett
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';

export const GET: RequestHandler = async ({ request }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    const url = new URL(request.url);
    const query = url.searchParams.get('query')?.toLowerCase();
    const page = parseInt(url.searchParams.get('page') || '1');
    
    if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
    }
    
    const apiURL = `https://consumet.mysynology.net/anime/zoro/${query}?page=${page}`;
    
    try {
        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error(`Error fetching data from BakaServer: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Use the pagination data from the external API if available, otherwise fallback to our logic
        const results = data.results || [];
        
        const processedData = {
            currentPage: data.currentPage || page,
            hasNextPage: data.hasNextPage !== undefined ? data.hasNextPage : results.length >= 25,
            totalPages: data.totalPages || (data.hasNextPage ? page + 1 : page),
            results: results
        };
        
        return new Response(JSON.stringify(processedData), { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
};
