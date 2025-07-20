// SvelteKit endpoint for Real-Debrid integration
import type { RequestHandler } from '@sveltejs/kit';
import { REAL_DEBRID_AUTH } from '$env/static/private';

// Helper: Get Real-Debrid headers (replace with your logic)
function getRealDebridHeaders() {
	return {
		'Authorization': `Bearer ${REAL_DEBRID_AUTH}`
	};
}

// Delete torrent (DELETE /api/torrents/delete/[id])
export const DELETE: RequestHandler = async ({ params }) => {
    const { id } = params;
    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing torrent id' }), { status: 400 });
    }
    await fetch(`https://api.real-debrid.com/rest/1.0/torrents/delete/${id}`,
        {
            method: 'DELETE',
            headers: getRealDebridHeaders()
        }
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
};
