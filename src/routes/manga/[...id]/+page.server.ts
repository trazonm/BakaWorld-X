import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	// params.id is now an array like ["3069", "naruto"] because we use [...id]
	const mangaIdSegments = params.id;
	const searchQuery = url.searchParams.get('query') || '';
	
	if (!mangaIdSegments) {
		throw error(400, 'Manga ID is required');
	}

	try {
		// Join the segments back together: ["3069", "naruto"] -> "3069/naruto"
		const mangaId = mangaIdSegments;
		// Prepend "manga/" for the API call
		const fullMangaId = `manga/${mangaId}`;
		const mangaResponse = await fetch(`/api/search/manga/${encodeURIComponent(fullMangaId)}`);
		
		if (!mangaResponse.ok) {
			console.error(`Failed to fetch manga: ${mangaResponse.status} ${mangaResponse.statusText}`);
			throw error(mangaResponse.status, 'Manga not found');
		}

		const manga = await mangaResponse.json();

		return {
			manga,
			searchQuery
		};
	} catch (err) {
		console.error('Error loading manga:', err);
		if (err instanceof Error && err.message.includes('404')) {
			throw error(404, 'Manga not found');
		}
		throw error(500, 'Failed to load manga');
	}
};

