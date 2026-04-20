// MegaPlay: `s-2` (Aniwatch ?ep= id), MAL/AniList + ep#; else catalog AnimeKai HLS fallback.
import type { RequestHandler } from '@sveltejs/kit';
import { createConsumetService, type ConsumetWatchResponse } from '$lib/services/consumetService';
import { config } from '$lib/config';
import { extractAnimeExternalIds } from '$lib/server/animePlaybackMeta';
import { userFacingErrorMessage } from '$lib/utils/userFacingErrorMessage';
import '$lib/server/dns-config';

function decodeEpisodeSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

function parsePositiveIntParam(v: string | null): number | undefined {
	if (v == null || v === '') return undefined;
	const n = parseInt(v, 10);
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const GET: RequestHandler = async ({ params, url }) => {
	const language = url.searchParams.get('language') === 'dub' ? 'dub' : 'sub';
	const dub = language === 'dub';

	let episodeId = params.episodeId;
	if (!episodeId) {
		return new Response(JSON.stringify({ error: 'Episode ID is required' }), { status: 400 });
	}

	episodeId = decodeEpisodeSegment(episodeId);

	const provider = config.consumet.defaultAnimeProvider;
	const consumetService = createConsumetService(config.consumet.baseUrl);

	const animeId = url.searchParams.get('animeId')?.trim() || '';
	const episodeNumber =
		parsePositiveIntParam(url.searchParams.get('episodeNumber')) ??
		parsePositiveIntParam(url.searchParams.get('ep'));

	let malId = parsePositiveIntParam(url.searchParams.get('malId'));
	let anilistId = parsePositiveIntParam(url.searchParams.get('anilistId'));

	const useMega = config.megaplay.useMetaEmbedWhenAvailable;
	const megaBase = config.megaplay.baseUrl.replace(/\/$/, '');
	const lang = language === 'dub' ? 'dub' : 'sub';

	try {
		// Aniwatch numeric episode id → MegaPlay s-2 (see https://megaplay.buzz/api )
		if (useMega && /^\d+$/.test(episodeId)) {
			const embedUrl = `${megaBase}/stream/s-2/${episodeId}/${lang}`;
			return new Response(
				JSON.stringify({
					playback: 'embed',
					embedUrl,
					sources: [
						{
							url: embedUrl,
							quality: 'default',
							isM3U8: false,
							isEmbed: true
						}
					],
					headers: {},
					languageUsed: lang,
					playbackSource: 'megaplay-s2'
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		if (useMega && episodeNumber != null && malId == null && anilistId == null && animeId) {
			try {
				const info = (await consumetService.getAnimeInfo(
					animeId,
					provider
				)) as Record<string, unknown>;
				const extracted = extractAnimeExternalIds(info);
				malId = extracted.malId;
				anilistId = extracted.anilistId;
			} catch (e) {
				console.warn(
					'anime/watch: getAnimeInfo for external ids failed; falling back to catalog watch',
					e
				);
			}
		}

		if (useMega && episodeNumber != null && (malId != null || anilistId != null)) {
			const embedUrl =
				malId != null
					? `${megaBase}/stream/mal/${malId}/${episodeNumber}/${lang}`
					: `${megaBase}/stream/ani/${anilistId}/${episodeNumber}/${lang}`;

			return new Response(
				JSON.stringify({
					playback: 'embed',
					embedUrl,
					sources: [
						{
							url: embedUrl,
							quality: 'default',
							isM3U8: false,
							isEmbed: true
						}
					],
					headers: {},
					languageUsed: lang,
					playbackSource: 'megaplay'
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		let data: ConsumetWatchResponse;
		let languageUsed: 'sub' | 'dub' = dub ? 'dub' : 'sub';
		let languageDubFallback = false;

		if (provider === 'animekai') {
			const resolved = await consumetService.getAnimeKaiWatchWithFallback(episodeId, dub);
			data = resolved.watch;
			languageUsed = resolved.dubUsed ? 'dub' : 'sub';
			languageDubFallback = resolved.dubFallback;
		} else {
			data = await consumetService.getEpisodeStreamingLinks(episodeId, provider, 'vidcloud', dub);
		}

		const referer =
			(data.headers?.Referer as string | undefined) ||
			(data.headers as { referer?: string })?.referer ||
			'https://animekai.to/';

		const sources = (data.sources || []).map((s) => ({
			...s,
			url: s.isM3U8
				? `/api/proxy/m3u8?url=${encodeURIComponent(s.url)}&referer=${encodeURIComponent(referer)}`
				: s.url,
			isEmbed: false
		}));

		return new Response(
			JSON.stringify({
				playback: 'hls',
				headers: data.headers,
				sources,
				download: data.download,
				languageUsed,
				...(languageDubFallback ? { languageDubFallback: true } : {}),
				playbackSource: 'catalog-hls'
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error('Episode streaming links error:', errorMessage);
		console.error('Error stack:', errorStack);

		return new Response(
			JSON.stringify({
				error: userFacingErrorMessage(errorMessage),
				details: errorStack,
				episodeId: params.episodeId
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
