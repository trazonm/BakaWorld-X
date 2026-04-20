import type { RequestHandler } from '@sveltejs/kit';
import { createConsumetService } from '$lib/services/consumetService';
import { config } from '$lib/config';
import { userFacingErrorMessage } from '$lib/utils/userFacingErrorMessage';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id')?.trim();
	if (!id) {
		return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
	}

	try {
		const consumet = createConsumetService(config.consumet.baseUrl);
		const info = await consumet.getMovieInfo(id, config.consumet.defaultMovieProvider);
		return new Response(JSON.stringify(info), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error('Movie info error:', message);
		return new Response(JSON.stringify({ error: userFacingErrorMessage(message) }), { status: 500 });
	}
};
