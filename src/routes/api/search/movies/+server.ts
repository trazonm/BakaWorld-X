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
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error('Movie search error:', errorMessage);
		console.error('Error stack:', errorStack);
		return new Response(
			JSON.stringify({
				error: userFacingErrorMessage(errorMessage),
				details: errorStack
			}),
			{ status: 500 }
		);
	}
};
