import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { ConsumetMovieInfo, MovieEpisode, MovieServerOption } from '$lib/types/movie';
import {
	mergeMovieServerOptions,
	normalizeMovieEpisodes,
	pickPreferredServer,
	serverParamFromLabel,
	sortEpisodes
} from '$lib/server/flixhqPlayback';

function decodeEpisodeSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

export const load: PageServerLoad = async ({ params, fetch }) => {
	const mediaId = params.id;
	const episodeIdDecoded = decodeEpisodeSegment(params.episodeId);

	const infoRes = await fetch(`/api/movies/info?id=${encodeURIComponent(mediaId)}`);
	if (!infoRes.ok) {
		throw error(infoRes.status === 404 ? 404 : 502, 'Title not found');
	}

	const movieRaw = (await infoRes.json()) as ConsumetMovieInfo;
	const episodesSorted = sortEpisodes(normalizeMovieEpisodes(movieRaw.episodes));
	let movie: ConsumetMovieInfo;
	try {
		movie = JSON.parse(
			JSON.stringify({ ...movieRaw, episodes: episodesSorted })
		) as ConsumetMovieInfo;
	} catch (err) {
		console.error('Movie watch page: failed to serialize metadata', err);
		throw error(500, 'Could not load title metadata');
	}

	const episode = movie.episodes.find(
		(e: MovieEpisode) => e.id === episodeIdDecoded || e.id === params.episodeId
	);
	if (!episode) {
		throw error(404, 'Episode not found');
	}

	let servers: MovieServerOption[] = [];
	const sRes = await fetch(
		`/api/movies/servers?episodeId=${encodeURIComponent(episode.id)}&mediaId=${encodeURIComponent(mediaId)}`
	);
	if (sRes.ok) {
		const raw = await sRes.json();
		servers = Array.isArray(raw) ? raw : [];
	}

	let initialServer = pickPreferredServer(servers);
	const wRes = await fetch(
		`/api/movies/watch?episodeId=${encodeURIComponent(episode.id)}&mediaId=${encodeURIComponent(mediaId)}&server=${encodeURIComponent(initialServer)}`
	);

	let videoData: Awaited<ReturnType<Response['json']>> | null = null;
	let watchError: string | null = null;

	if (wRes.ok) {
		videoData = await wRes.json();
		const su = (videoData as { serverUsed?: string })?.serverUsed;
		if (su) initialServer = serverParamFromLabel(su);
	} else {
		const errBody = (await wRes.json().catch(() => ({}))) as { error?: string };
		watchError = errBody.error || `Could not load playback (${wRes.status})`;
	}

	const idx = movie.episodes.findIndex((e) => e.id === episode.id);
	const nextEpisode = idx >= 0 && idx < movie.episodes.length - 1 ? movie.episodes[idx + 1] : null;
	const prevEpisode = idx > 0 ? movie.episodes[idx - 1] : null;

	const serverOptions = mergeMovieServerOptions(servers);

	return {
		movie,
		episode,
		mediaId,
		episodeId: episode.id,
		servers,
		serverOptions,
		initialServer,
		videoData,
		watchError,
		nextEpisode,
		prevEpisode
	};
};
