// Composable for anime search functionality
import { writable, get } from 'svelte/store';
import { animeSearchService } from '$lib/services/animeService';
import type { Anime, AnimeSearchState } from '$lib/types/anime';

export function useAnimeSearch() {
	const initialState: AnimeSearchState = {
		query: '',
		results: [],
		loading: false,
		error: '',
		currentPage: 1,
		totalPages: 1,
		hasNextPage: false
	};

	const state = writable<AnimeSearchState>(initialState);

	async function search(query: string, page: number = 1) {
		if (!query.trim()) return;

		state.update(s => ({ ...s, loading: true, error: '', currentPage: page }));

		try {
			const response = await animeSearchService.searchAnime(query, page);
			
			state.update(s => ({
				...s,
				query,
				results: response.results,
				currentPage: response.currentPage,
				totalPages: response.totalPages,
				hasNextPage: response.hasNextPage,
				loading: false,
				error: ''
			}));
		} catch (error: any) {
			state.update(s => ({
				...s,
				loading: false,
				error: error.message || 'Search failed',
				results: []
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
