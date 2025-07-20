// SvelteKit endpoint for Real-Debrid integration
import type { RequestHandler } from '@sveltejs/kit';
import { REAL_DEBRID_AUTH } from '$env/static/private';

// Helper: Get Real-Debrid headers (replace with your logic)
function getRealDebridHeaders() {
	return {
		'Authorization': `Bearer ${REAL_DEBRID_AUTH}`
	};
}

// Helper: Select all files for a torrent
async function selectFiles(torrentId: string, headers: Record<string, string>) {
    const data = new URLSearchParams({ files: 'all' });
    await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`,
        {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: data.toString()
        }
    );
}

// Add magnet link (POST /api/torrents/magnet)
export const POST: RequestHandler = async ({ request }) => {
    console.log('Received magnet link request');
    const { link } = await request.json();
    if (!link || !link.startsWith('magnet:')) {
        return new Response(JSON.stringify({ error: 'Invalid magnet link provided' }), { status: 400 });
    }
    const data = new URLSearchParams({ magnet: link });
    const headers = {
        ...getRealDebridHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    const response = await fetch(
        'https://api.real-debrid.com/rest/1.0/torrents/addMagnet',
        {
            method: 'POST',
            headers,
            body: data.toString()
        }
    );
    const resData = await response.json();
    await selectFiles(resData.id, headers);
    return new Response(JSON.stringify(resData), { status: 200 });
};
