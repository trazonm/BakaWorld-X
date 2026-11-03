import type { RequestHandler } from '@sveltejs/kit';
import { createConsumetService } from '$lib/services/consumetService';
import { config } from '$lib/config';
import { userFacingErrorMessage } from '$lib/utils/userFacingErrorMessage';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ request }) => {
	const url = new URL(request.url);
	const query = url.searchParams.get('query')?.trim();
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));

	if (!query) {
		return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
	}

	try {
		const consumet = createConsumetService();
		const result = await consumet.searchMovies(query, config.consumet.defaultMovieProvider, page);

		return new Response(
			JSON.stringify({
				currentPage: result.currentPage,
				hasNextPage: result.hasNextPage,
				totalPages: result.totalPages,
				results: result.results
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Movie search error:', errorMessage);
		const timedOut = /timed out|timeout/i.test(errorMessage);
		const unavailable = /522|503|502|500|ENOTFOUND|ECONNREFUSED|Network error|catalog/i.test(errorMessage);
		return new Response(
			JSON.stringify({
				error: timedOut
					? 'Movie search timed out. The catalog did not respond.'
					: unavailable
						? 'Movie search is unavailable right now. Try again in a moment.'
						: userFacingErrorMessage(errorMessage)
			}),
			{ status: 502 }
		);
	}
};
