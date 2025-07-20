// SvelteKit endpoint for Real-Debrid integration
import type { RequestHandler } from '@sveltejs/kit';
import { REAL_DEBRID_AUTH } from '$env/static/private';

// Helper: Get Real-Debrid headers (replace with your logic)
function getRealDebridHeaders() {
	return {
		'Authorization': `Bearer ${REAL_DEBRID_AUTH}`
	};
}

// Unrestrict a link (POST /api/torrents/unrestrict)
export const POST: RequestHandler = async ({ request }) => {
	const { link } = await request.json();
	if (!link) {
		return new Response(JSON.stringify({ error: 'Link parameter is required' }), { status: 400 });
	}
	const data = new URLSearchParams({ link });
	const apiURL = `https://api.real-debrid.com/rest/1.0/unrestrict/link`;
	const response = await fetch(apiURL, {
		method: 'POST',
		headers: {
			...getRealDebridHeaders(),
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: data.toString()
	});
	const resData = await response.json();
	return new Response(JSON.stringify(resData), { status: 200 });
};