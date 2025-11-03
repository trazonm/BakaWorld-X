// Anime episode streaming links endpoint using Consumet API
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createConsumetService } from '$lib/services/consumetService';
import { config } from '$lib/config';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ request, params, url }) => {
    // TODO: Re-enable auth when ready
    // const user = getSessionUser(request);
    // if (!user) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }
    
    let episodeId = params.episodeId;
    const language = url.searchParams.get('language') || 'sub'; // sub or dub
    
    if (!episodeId) {
        return new Response(JSON.stringify({ error: 'Episode ID is required' }), { status: 400 });
    }
    
    // Convert URL-safe episode ID back to original format (replace - with $)
    // Format: anime-name-id$episode$hianime-ep-id
    episodeId = episodeId.replace(/-/g, '$');
    
    console.log('Episode watch - Original ID from URL:', params.episodeId);
    console.log('Episode watch - Converted ID:', episodeId);
    console.log('Episode watch - Language:', language);
    
    try {
        // Extract the hianime episode ID (the number after $episode$)
        // Format: dragon-ball-509$episode$10218
        const parts = episodeId.split('$episode$');
        if (parts.length !== 2) {
            throw new Error(`Invalid episode ID format: ${episodeId}. Expected format: anime-id$episode$ep-number`);
        }
        
        const hianimeEpId = parts[1];
        console.log('Extracted hianime episode ID:', hianimeEpId);
        
        // Create MegaPlay embed URL
        // Format: https://megaplay.buzz/stream/s-2/{hianime-ep-id}/{language}
        const embedUrl = `https://megaplay.buzz/stream/s-2/${hianimeEpId}/${language}`;
        console.log('MegaPlay embed URL:', embedUrl);
        
        // Return the embed URL in a format compatible with the video player
        const response = {
            embedUrl: embedUrl,
            sources: [{
                url: embedUrl,
                quality: 'default',
                isM3U8: false,
                isEmbed: true
            }],
            headers: {}
        };
        
        return new Response(JSON.stringify(response), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Episode streaming links error:', errorMessage);
        console.error('Error stack:', errorStack);
        
        return new Response(JSON.stringify({ 
            error: errorMessage,
            details: errorStack,
            episodeId: params.episodeId,
            convertedId: episodeId,
            server: server
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
