import type { RequestHandler } from '@sveltejs/kit';
import { createConsumetService } from '$lib/services/consumetService';
import { config } from '$lib/config';
import '$lib/server/dns-config';

export const GET: RequestHandler = async () => {
	try {
		const consumet = createConsumetService(config.consumet.baseUrl);
		const results = await consumet.getMovieTrending(config.consumet.defaultMovieProvider);
		return new Response(JSON.stringify({ results }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error('Movie trending error:', message);
		return new Response(JSON.stringify({ results: [], error: message }), { status: 200 });
	}
};
