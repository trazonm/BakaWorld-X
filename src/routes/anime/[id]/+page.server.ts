import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		const response = await fetch(`/api/search/anime/${params.id}`);
		
		if (!response.ok) {
			throw error(response.status, 'Anime not found');
		}
		
		const animeData = await response.json();
		return {
			anime: animeData
		};
	} catch (err) {
		throw error(404, 'Anime not found');
	}
};
