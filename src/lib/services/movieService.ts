import type { MovieSearchResponse } from '$lib/types/movie';

class MovieSearchService {
	async searchMovies(query: string, page: number = 1): Promise<MovieSearchResponse> {
		const response = await fetch(
			`/api/search/movies?query=${encodeURIComponent(query)}&page=${encodeURIComponent(String(page))}`
		);

		if (!response.ok) {
			throw new Error(`Search failed: ${response.statusText}`);
		}

		const data = await response.json();

		return {
			currentPage: data.currentPage || page,
			hasNextPage: data.hasNextPage || false,
			totalPages:
				typeof data.totalPages === 'number' && data.totalPages >= 1 ? data.totalPages : undefined,
			results: data.results || []
		};
	}
}

export const movieSearchService = new MovieSearchService();
