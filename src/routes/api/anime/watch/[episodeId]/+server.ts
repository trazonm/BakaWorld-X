import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';

export const GET: RequestHandler = async ({ request, params, url }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    console.log('Received request for episode:', params.episodeId);
    console.log('Request URL:', request.url);
    const episodeId = params.episodeId;
    const server = url.searchParams.get('server') || 'hd-2';
    const category = url.searchParams.get('category') || 'sub';
    
    if (!episodeId) {
        return new Response(JSON.stringify({ error: 'Episode ID is required' }), { status: 400 });
    }
    
    // Validate server parameter for Hakai API
    const validServers = ['hd-1', 'hd-2', 'hd-3'];
    if (!validServers.includes(server)) {
        return new Response(JSON.stringify({ error: 'Invalid server' }), { status: 400 });
    }
    
    // Validate category parameter
    const validCategories = ['sub', 'dub'];
    if (!validCategories.includes(category)) {
        return new Response(JSON.stringify({ error: 'Invalid category' }), { status: 400 });
    }
    
    // Use Hakai API instead of Consumet
    const apiURL = `https://hakai-api.onrender.com/api/hianime/watch/${episodeId}?category=${category}&server=${server}`;
    console.log('Fetching video data from:', apiURL);
    
    try {
        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error(`Error fetching video data: ${response.statusText}`);
        }
        const rawData = await response.json();
        
        // Transform subtitle data from Hakai API format to expected format
        if (rawData.data && rawData.data.subtitles) {
            rawData.data.subtitles = rawData.data.subtitles
                .filter((subtitle: any) => subtitle.lang !== 'thumbnails') // Filter out thumbnail tracks
                .map((subtitle: any) => ({
                    file: subtitle.url,
                    label: subtitle.lang,
                    kind: 'captions'
                }));
        }
        
        return new Response(JSON.stringify(rawData), { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
};
