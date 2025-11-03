// Real-Debrid unrestrict link endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { createRealDebridService } from '$lib/services/realDebridService';
import { REAL_DEBRID_AUTH } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const realDebridService = createRealDebridService(REAL_DEBRID_AUTH);
    try {
        const { link, password } = await request.json();
        
        if (!link) {
            return new Response(
                JSON.stringify({ error: 'Link parameter is required' }), 
                { status: 400 }
            );
        }

        const result = await realDebridService.unrestrictLink(link, password);
        
        return new Response(JSON.stringify(result), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to unrestrict link';
        console.error('Unrestrict link error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }), 
            { status: 500 }
        );
    }
};