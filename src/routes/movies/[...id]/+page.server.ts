import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { ConsumetMovieInfo } from '$lib/types/movie';
import { normalizeMovieEpisodes, sortEpisodes } from '$lib/server/flixhqPlayback';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const mediaId = params.id;
	const searchQuery = url.searchParams.get('query') || '';

	if (!mediaId?.trim()) {
		throw error(400, 'Missing title id');
	}

	const infoRes = await fetch(`/api/movies/info?id=${encodeURIComponent(mediaId)}`);
	if (!infoRes.ok) {
		throw error(infoRes.status === 404 ? 404 : 502, 'Could not load title');
	}

	const movie = (await infoRes.json()) as ConsumetMovieInfo;
	const episodesSorted = sortEpisodes(normalizeMovieEpisodes(movie.episodes));
	let movieOut: ConsumetMovieInfo;
	try {
		movieOut = JSON.parse(
			JSON.stringify({ ...movie, episodes: episodesSorted })
		) as ConsumetMovieInfo;
	} catch (err) {
		console.error('Movie page: failed to serialize metadata', err);
		throw error(500, 'Could not load title metadata');
	}

	return {
		movie: movieOut,
		searchQuery,
		mediaId
	};
};
