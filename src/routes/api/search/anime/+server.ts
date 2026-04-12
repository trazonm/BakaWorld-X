// Anime search via Aniwatch-Api (idanime → MegaPlay-compatible catalog)
import type { RequestHandler } from '@sveltejs/kit';
import { aniwatchSearch } from '$lib/server/aniwatchClient';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ request }) => {
	const url = new URL(request.url);
	const query = url.searchParams.get('query')?.trim();
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));

	if (!query) {
		return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
	}

	try {
		const result = await aniwatchSearch(query, page);
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error('Anime search error:', errorMessage);
		console.error('Error stack:', errorStack);
		return new Response(
			JSON.stringify({
				error: errorMessage,
				details: errorStack
			}),
			{ status: 500 }
		);
	}
};
