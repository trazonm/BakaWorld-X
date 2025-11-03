// Composable for manga search functionality
import { writable, get } from 'svelte/store';
import type { ConsumetManga, MangaSearchState } from '$lib/types/manga';

export function useMangaSearch() {
	const initialState: MangaSearchState = {
		query: '',
		results: [],
		loading: false,
		error: '',
		currentPage: 1,
		totalPages: 1,
		hasNextPage: false,
		hasSearched: false // Track if a search has been executed
	};

	const state = writable<MangaSearchState>(initialState);

	async function search(query: string, page: number = 1) {
		if (!query.trim()) return;

		state.update(s => ({ ...s, loading: true, error: '', currentPage: page, hasSearched: true }));

		try {
			const response = await fetch(`/api/search/manga?query=${encodeURIComponent(query)}&page=${page}`);
			
			if (!response.ok) {
				throw new Error(`Search failed: ${response.statusText}`);
			}
			
			const data = await response.json();
			
			state.update(s => ({
				...s,
				query,
				results: data.results,
				currentPage: data.currentPage,
				totalPages: data.totalPages || 1,
				hasNextPage: data.hasNextPage,
				loading: false,
				error: '',
				hasSearched: true
			}));
		} catch (error: any) {
			state.update(s => ({
				...s,
				loading: false,
				error: error.message || 'Search failed',
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

