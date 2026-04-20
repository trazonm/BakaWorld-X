import type { RequestHandler } from '@sveltejs/kit';
import { createConsumetService, type ConsumetMovieWatchResponse } from '$lib/services/consumetService';
import { config } from '$lib/config';
import { resolveFlixhqEmbedUrl } from '$lib/server/flixhqEmbed';
import { tryFetchHlsFromEmbedPage } from '$lib/server/movieEmbedToHls';
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

/** Use `<video>` + HLS proxy when we can scrape a `.m3u8` from the third-party embed HTML (server fetch + FlixHQ Referer). */
function hlsWatchFromExtractedM3u8(m3u8Url: string, segmentReferer: string, serverUsed: string) {
	const proxied = `/api/proxy/m3u8?url=${encodeURIComponent(m3u8Url)}&referer=${encodeURIComponent(segmentReferer)}`;
	return {
		playback: 'hls' as const,
		headers: { Referer: segmentReferer },
		sources: [{ url: proxied, quality: 'auto', isM3U8: true as const }],
		subtitles: [] as { lang: string; url: string }[],
		playbackSource: 'embed-hls-extract' as const,
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
	try {
		const extracted = await tryFetchHlsFromEmbedPage(embedUrl, mediaId);
		if (extracted) {
			const body = hlsWatchFromExtractedM3u8(extracted.m3u8, extracted.pageUrl, serverUsed);
			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	} catch (e) {
		console.warn('Movie embed → HLS extract failed:', e);
	}
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

	const consumetClient = createConsumetService();

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
