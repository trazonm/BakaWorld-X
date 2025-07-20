import type { RequestHandler } from '@sveltejs/kit';
import { REAL_DEBRID_AUTH } from '$env/static/private';

// Helper: Get Real-Debrid headers (replace with your logic)
function getRealDebridHeaders() {
	return {
		'Authorization': `Bearer ${REAL_DEBRID_AUTH}`
	};
}

// Check torrent progress (GET /api/torrents/info/[id])
export const GET: RequestHandler = async ({ params }) => {
    const { id } = params;
    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing torrent id' }), { status: 400 });
    }
    const response = await fetch(
        `https://api.real-debrid.com/rest/1.0/torrents/info/${id}`,
        {
            method: 'GET',
            headers: getRealDebridHeaders()
        }
    );
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
};