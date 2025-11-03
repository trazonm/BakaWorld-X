import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const comicId = params.id;
	const searchQuery = url.searchParams.get('query') || '';
	
	if (!comicId) {
		throw error(400, 'Comic ID is required');
	}

	try {
		const comicResponse = await fetch(`/api/search/comics/${comicId}`);
		
		if (!comicResponse.ok) {
			throw error(comicResponse.status, 'Comic not found');
		}

		const comic = await comicResponse.json();

		return {
			comic,
			searchQuery
		};
	} catch (err) {
		console.error('Error loading comic:', err);
		if (err instanceof Error && err.message.includes('404')) {
			throw error(404, 'Comic not found');
		}
		throw error(500, 'Failed to load comic');
	}
};

