import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const language = url.searchParams.get('language') || 'sub';
	
	try {
		console.log('=== DEBUG INFO ===');
		console.log('Anime ID:', params.id);
		console.log('Episode ID from URL:', params.episodeId);
		console.log('Language:', language);
		
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
		
		// Find the current episode (URL uses - instead of $)
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
		
		// Get video sources using MegaPlay embed
		const videoResponse = await fetch(`/api/anime/watch/${params.episodeId}?language=${language}`);
		console.log('Video response status:', videoResponse.status);
		
		if (!videoResponse.ok) {
			const errorData = await videoResponse.json().catch(() => ({}));
			console.error('Video sources API error:', videoResponse.status, errorData);
			
			// If it's a 503 (Service Unavailable), show the helpful error message
			if (videoResponse.status === 503 && errorData.message) {
				throw error(503, errorData.message);
			}
			
			throw error(videoResponse.status, errorData.error || errorData.message || 'Video sources not found');
		}
		
		const videoData = await videoResponse.json();
		console.log('Video data received:', videoData ? 'Yes' : 'No', 'Sources:', videoData?.sources?.length || 0);
		
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
			language,
			animeId: params.id,
			episodeId: params.episodeId
		};
	} catch (err) {
		console.error('Page load error:', err);
		
		// If it's already a SvelteKit error, re-throw it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		
		// Otherwise throw a generic error
		const errorMessage = err instanceof Error ? err.message : 'Content not found';
		console.error('Throwing error:', errorMessage);
		throw error(500, errorMessage);
	}
};
