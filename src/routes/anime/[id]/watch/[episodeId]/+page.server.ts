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
		
		// Check language availability - prefer episode-level info, fall back to anime-level
		// The API might return sub/dub as numbers OR hasSub/hasDub as booleans
		// Check both formats to be safe
		const episodeHasSub = currentEpisode.isSubbed === true || 
			(animeData.hasSub === true || (animeData.sub ?? 0) > 0);
		const episodeHasDub = currentEpisode.isDubbed === true || 
			(animeData.hasDub === true || (animeData.dub ?? 0) > 0);
		
		console.log('Language availability check:');
		console.log('  Episode isSubbed:', currentEpisode.isSubbed);
		console.log('  Episode isDubbed:', currentEpisode.isDubbed);
		console.log('  Anime hasSub:', animeData.hasSub);
		console.log('  Anime hasDub:', animeData.hasDub);
		console.log('  Anime sub:', animeData.sub);
		console.log('  Anime dub:', animeData.dub);
		console.log('  Final episodeHasSub:', episodeHasSub);
		console.log('  Final episodeHasDub:', episodeHasDub);
		console.log('Requested language:', language);
		
		// Determine the actual language to use - auto-fallback if requested language isn't available
		let actualLanguage = language;
		let languageFallback = false;
		
		// If requested language is not available, try to fall back to the other option
		if (language === 'dub' && !episodeHasDub) {
			if (episodeHasSub) {
				console.log('Dub not available for this episode, falling back to sub');
				actualLanguage = 'sub';
				languageFallback = true;
			} else {
				console.log('Warning: Neither dub nor sub appears to be available for this episode');
				// Still try to load what was requested - maybe the API will work anyway
			}
		} else if (language === 'sub' && !episodeHasSub) {
			if (episodeHasDub) {
				console.log('Sub not available for this episode, falling back to dub');
				actualLanguage = 'dub';
				languageFallback = true;
			} else {
				console.log('Warning: Neither sub nor dub appears to be available for this episode');
				// Still try to load what was requested - maybe the API will work anyway
			}
		}
		
		// Load the video with the determined language (may be different from requested)
		const videoResponse = await fetch(`/api/anime/watch/${params.episodeId}?language=${actualLanguage}`);
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
		
		// If video loaded successfully, the language is definitely available
		// Update availability flags based on successful load
		if (videoData && (videoData.embedUrl || videoData.sources?.length > 0)) {
			if (actualLanguage === 'sub') {
				// If sub loaded successfully, mark it as available
				animeData.hasSub = true;
				animeData.sub = animeData.sub || 1;
			} else if (actualLanguage === 'dub') {
				// If dub loaded successfully, mark it as available
				animeData.hasDub = true;
				animeData.dub = animeData.dub || 1;
			}
		}
		
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
			language: actualLanguage, // Return the actual language used (may be different from requested)
			languageFallback, // Indicate if we had to fall back
			requestedLanguage: language, // Keep track of what was originally requested
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
