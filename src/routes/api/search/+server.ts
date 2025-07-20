// SvelteKit endpoint for searching torrents via Jackett
import type { RequestHandler } from '@sveltejs/kit';
import { JACKETT_API_KEY } from '$env/static/private';
import { getSessionUser } from '$lib/server/session';

export const GET: RequestHandler = async ({ request }) => {
    const user = getSessionUser(request);
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const query = new URL(request.url).searchParams.get('query')?.toLowerCase();
    if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
    }
    const apiURL = `https://jackett-service.gleeze.com/api/v2.0/indexers/all/results?apikey=${JACKETT_API_KEY}&Query=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error(`Error fetching data from Jackett: ${response.statusText}`);
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });

    }
};
