import { writable, get } from 'svelte/store';
import { movieSearchService } from '$lib/services/movieService';
import type { MovieSearchState } from '$lib/types/movie';
import { userFacingErrorMessage } from '$lib/utils/userFacingErrorMessage';

function inferTotalPages(
	prevTotal: number,
	page: number,
	hasNextPage: boolean,
	apiTotal?: number
): number {
	if (apiTotal && apiTotal >= 1) return apiTotal;
	if (!hasNextPage) return page;
	return Math.max(prevTotal, page + 1);
}

export function useMovieSearch() {
	const initialState: MovieSearchState = {
		query: '',
		results: [],
		loading: false,
		error: '',
		currentPage: 1,
		totalPages: 1,
		hasNextPage: false,
		hasSearched: false
	};

	const state = writable<MovieSearchState>(initialState);

	async function search(query: string, page: number = 1) {
		if (!query.trim()) return;

		state.update((s) => ({ ...s, loading: true, error: '', currentPage: page, hasSearched: true }));

		try {
			const response = await movieSearchService.searchMovies(query, page);
			const prev = get(state);

			const totalPages = inferTotalPages(
				page === 1 ? 1 : prev.totalPages,
				response.currentPage,
				response.hasNextPage,
				response.totalPages
			);

			state.update((s) => ({
				...s,
				query,
				results: response.results,
				currentPage: response.currentPage,
				totalPages,
				hasNextPage: response.hasNextPage,
				loading: false,
				error: '',
				hasSearched: true
			}));
		} catch (error: unknown) {
			const message = userFacingErrorMessage(
				error instanceof Error ? error.message : 'Search failed'
			);
			state.update((s) => ({
				...s,
				loading: false,
				error: message,
				results: [],
				hasSearched: true
			}));
		}
	}

	function nextPage() {
		const currentState = get(state);
		if (currentState.hasNextPage && currentState.currentPage < currentState.totalPages && !currentState.loading) {
			search(currentState.query, currentState.currentPage + 1);
		}
	}

	function prevPage() {
		const currentState = get(state);
		if (currentState.currentPage > 1 && !currentState.loading) {
			search(currentState.query, currentState.currentPage - 1);
		}
	}

	function goToPage(page: number) {
		const currentState = get(state);
		if (page >= 1 && page <= currentState.totalPages && !currentState.loading) {
			search(currentState.query, page);
		}
	}

	function reset() {
		state.set(initialState);
	}

	return {
		state,
		search,
		nextPage,
		prevPage,
		goToPage,
		reset
	};
}
