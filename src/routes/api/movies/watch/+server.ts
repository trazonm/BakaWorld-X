import type { RequestHandler } from '@sveltejs/kit';
import { createConsumetService, type ConsumetMovieWatchResponse } from '$lib/services/consumetService';
import { config } from '$lib/config';
import { resolveFlixhqEmbedUrl } from '$lib/server/flixhqEmbed';
import { serverParamFromLabel } from '$lib/server/flixhqPlayback';
import { userFacingErrorMessage } from '$lib/utils/userFacingErrorMessage';
import '$lib/server/dns-config';

function normalizeWatchJson(data: ConsumetMovieWatchResponse) {
	const referer =
		(data.headers?.Referer as string | undefined) ||
		(data.headers as { referer?: string })?.referer ||
		'https://flixhq.to/';

	const sources = (data.sources || []).map((s) => ({
		...s,
		url: s.isM3U8
			? `/api/proxy/m3u8?url=${encodeURIComponent(s.url)}&referer=${encodeURIComponent(referer)}`
			: s.url
	}));

	const subtitles = (data.subtitles || []).map((s) => ({
		lang: s.lang,
		url: `/api/proxy/subtitles?url=${encodeURIComponent(s.url)}&referer=${encodeURIComponent(referer)}`
	}));

	return {
		playback: 'hls' as const,
		headers: data.headers,
		sources,
		subtitles,
		download: data.download,
		playbackSource: 'catalog-movies' as const
	};
}

function normalizeEmbedWatchJson(embedUrl: string, serverUsed: string) {
	return {
		playback: 'embed' as const,
		embedUrl,
		sources: [{ url: embedUrl, quality: 'auto', isM3U8: false as const }],
		headers: { Referer: embedUrl },
		subtitles: [] as { lang: string; url: string }[],
		playbackSource: 'embed-fallback' as const,
		serverUsed
	};
}

async function tryFlixhqEmbedFallback(
	episodeId: string,
	mediaId: string,
	preferred: string[]
): Promise<Response> {
	const { embedUrl, serverLabel } = await resolveFlixhqEmbedUrl(episodeId, mediaId, preferred);
	/** Must match `<option value>` (vidcloud | upcloud | mixdrop), not FlixHQ label text */
	const serverUsed = serverParamFromLabel(serverLabel);
	return new Response(
		JSON.stringify(normalizeEmbedWatchJson(embedUrl, serverUsed)),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
}

/** Single-server mode: no Consumet multi-server fallback; FlixHQ embed is still used if Consumet fails. */
export const GET: RequestHandler = async ({ url }) => {
	const episodeId = url.searchParams.get('episodeId')?.trim();
	const mediaId = url.searchParams.get('mediaId')?.trim();
	const server = url.searchParams.get('server')?.trim().toLowerCase();
	const singleOnly = url.searchParams.get('single') === '1' || url.searchParams.get('single') === 'true';

	if (!episodeId || !mediaId) {
		return new Response(JSON.stringify({ error: 'episodeId and mediaId are required' }), { status: 400 });
	}

	const consumetClient = createConsumetService(config.consumet.baseUrl);

	try {
		if (singleOnly && server) {
			try {
				const data = await consumetClient.getMovieWatch(
					episodeId,
					mediaId,
					server,
					config.consumet.defaultMovieProvider
				);
				return new Response(
					JSON.stringify({ ...normalizeWatchJson(data), serverUsed: server }),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			} catch {
				return await tryFlixhqEmbedFallback(episodeId, mediaId, [server]);
			}
		}

		try {
			const { watch, serverUsed } = await consumetClient.getMovieWatchWithFallback(
				episodeId,
				mediaId,
				config.consumet.defaultMovieProvider,
				server || undefined
			);
			return new Response(
				JSON.stringify({ ...normalizeWatchJson(watch), serverUsed }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		} catch {
			const order = server ? [server, 'vidcloud', 'upcloud', 'mixdrop'] : ['vidcloud', 'upcloud', 'mixdrop'];
			return await tryFlixhqEmbedFallback(episodeId, mediaId, [...new Set(order)]);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error('Movie watch error:', message, { episodeId, mediaId });
		return new Response(JSON.stringify({ error: userFacingErrorMessage(message) }), { status: 500 });
	}
};
