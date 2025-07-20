import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const server = url.searchParams.get('server') || 'hd-2';
	const category = url.searchParams.get('category') || 'dub';
	
	try {
		console.log('=== DEBUG INFO ===');
		console.log('Anime ID:', params.id);
		console.log('Episode ID from URL:', params.episodeId);
		console.log('Server:', server);
		console.log('Category:', category);
		
		// Get anime details
		const animeResponse = await fetch(`/api/search/anime/${params.id}`);
		if (!animeResponse.ok) {
			console.log('Failed to get anime details:', animeResponse.status);
			throw error(animeResponse.status, 'Anime not found');
		}
		const animeData = await animeResponse.json();
		console.log('Found anime:', animeData.title);
		console.log('Episodes found:', animeData.episodes?.length || 0);
		
		if (animeData.episodes?.length > 0) {
			console.log('First few episode IDs:', animeData.episodes.slice(0, 3).map((ep: any) => ep.id));
		}
		
		// Find the current episode
		const currentEpisode = animeData.episodes?.find((ep: any) => 
			ep.id.replace(/\$/g, '-') === params.episodeId
		);
		
		console.log('Current episode found:', !!currentEpisode);
		if (currentEpisode) {
			console.log('Episode details:', currentEpisode.title, currentEpisode.number);
		}
		
		if (!currentEpisode) {
			console.log('Episode not found. Looking for:', params.episodeId);
			console.log('Available episodes:', animeData.episodes?.map((ep: any) => ep.id.replace(/\$/g, '-')).slice(0, 5));
			throw error(404, 'Episode not found');
		}
		
		// Get video sources with category parameter
		const videoResponse = await fetch(`/api/anime/watch/${params.episodeId}?server=${server}&category=${category}`);
		if (!videoResponse.ok) {
			throw error(videoResponse.status, 'Video sources not found');
		}
		const videoData = await videoResponse.json();
		
		// Find next and previous episodes
		const currentIndex = animeData.episodes?.findIndex((ep: any) => 
			ep.id.replace(/\$/g, '-') === params.episodeId
		) ?? -1;
		
		const nextEpisode = currentIndex >= 0 && currentIndex < animeData.episodes.length - 1 
			? animeData.episodes[currentIndex + 1] 
			: null;
			
		const prevEpisode = currentIndex > 0 
			? animeData.episodes[currentIndex - 1] 
			: null;
		
		return {
			anime: animeData,
			episode: currentEpisode,
			videoData,
			nextEpisode,
			prevEpisode,
			server,
			category,
			animeId: params.id,
			episodeId: params.episodeId
		};
	} catch (err) {
		throw error(404, 'Content not found');
	}
};
