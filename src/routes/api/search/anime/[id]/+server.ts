// Anime detail via Aniwatch-Api (`/api/related` + `/api/episode`)
import type { RequestHandler } from '@sveltejs/kit';
import { aniwatchGetAnimeDetail } from '$lib/server/aniwatchClient';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ params }) => {
	const animeId = params.id;
	if (!animeId) {
		return new Response(JSON.stringify({ error: 'Anime ID is required' }), { status: 400 });
	}

	try {
		const payload = await aniwatchGetAnimeDetail(animeId);
		return new Response(JSON.stringify(payload), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Anime info error:', errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
	}
};
