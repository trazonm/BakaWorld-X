// SvelteKit endpoint for Real-Debrid integration
import type { RequestHandler } from '@sveltejs/kit';
import { REAL_DEBRID_AUTH } from '$env/static/private';

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

// Add torrent file (POST /api/torrents/add)
export const POST: RequestHandler = async ({ request }) => {
    console.log('Adding torrent file...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return new Response(JSON.stringify({ error: 'No torrent file provided' }), { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const headers = { ...getRealDebridHeaders(), 'Content-Type': 'application/octet-stream' };
    const response = await fetch(
        'https://api.real-debrid.com/rest/1.0/torrents/addTorrent',
        {
            method: 'PUT',
            headers,
            body: Buffer.from(arrayBuffer)
        }
    );
    const data = await response.json();
    await selectFiles(data.id, headers);
    return new Response(JSON.stringify(data), { status: 200 });
};
