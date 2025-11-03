// Manga-related type definitions
import type { ConsumetManga, ConsumetMangaInfo, ConsumetMangaChapter, ConsumetMangaPagesResponse } from '$lib/services/consumetService';

export type { ConsumetManga, ConsumetMangaInfo, ConsumetMangaChapter, ConsumetMangaPagesResponse };

export interface MangaSearchResponse {
	currentPage: number;
	hasNextPage: boolean;
	totalPages: number;
	results: ConsumetManga[];
}

export interface MangaSearchState {
	query: string;
	results: ConsumetManga[];
	loading: boolean;
	error: string;
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
	hasSearched: boolean; // Track if a search has been executed
}

