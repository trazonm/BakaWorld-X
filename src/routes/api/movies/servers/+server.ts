import type { RequestHandler } from '@sveltejs/kit';
import { createConsumetService } from '$lib/services/consumetService';
import { config } from '$lib/config';
import { userFacingErrorMessage } from '$lib/utils/userFacingErrorMessage';
import '$lib/server/dns-config';

export const GET: RequestHandler = async ({ url }) => {
	const episodeId = url.searchParams.get('episodeId')?.trim();
	const mediaId = url.searchParams.get('mediaId')?.trim();
	if (!episodeId || !mediaId) {
		return new Response(JSON.stringify({ error: 'episodeId and mediaId are required' }), { status: 400 });
	}

	try {
		const consumet = createConsumetService();
		const servers = await consumet.getMovieEpisodeServers(
			episodeId,
			mediaId,
			config.consumet.defaultMovieProvider
		);
		return new Response(JSON.stringify(servers), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error('Movie servers error:', message);
		return new Response(JSON.stringify({ error: userFacingErrorMessage(message) }), { status: 500 });
	}
};
