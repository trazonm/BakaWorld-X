// SvelteKit endpoint for fetching individual anime details
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';

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
    
    const apiURL = `https://consumet.mysynology.net/anime/zoro/info?id=${animeId}`;
    
    try {
        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error(`Error fetching anime data: ${response.statusText}`);
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
};
