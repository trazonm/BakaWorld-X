import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const mangaId = params.id;
	const searchQuery = url.searchParams.get('query') || '';
	
	if (!mangaId) {
		throw error(400, 'Manga ID is required');
	}

	try {
		const mangaResponse = await fetch(`/api/search/manga/${mangaId}`);
		
		if (!mangaResponse.ok) {
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

