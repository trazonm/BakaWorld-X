// Anime search service
import type { AnimeSearchResponse } from '$lib/types/anime';

class AnimeSearchService {
	async searchAnime(query: string, page: number = 1): Promise<AnimeSearchResponse> {
		const response = await fetch(`/api/search/anime?query=${encodeURIComponent(query)}&page=${page}`);
		
		if (!response.ok) {
			throw new Error(`Search failed: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return {
			currentPage: data.currentPage || page,
			hasNextPage: data.hasNextPage || false,
			totalPages: data.totalPages || 1,
			results: data.results || []
		};
	}
}

export const animeSearchService = new AnimeSearchService();
