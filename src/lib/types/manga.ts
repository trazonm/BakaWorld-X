// Manga-related type definitions
import type { 
	MangapillSearchResult, 
	MangapillMangaInfo, 
	MangapillChapter, 
	MangapillPagesResponse,
	MangapillSearchResponse
} from '$lib/services/mangapillService';

export type { 
	MangapillSearchResult as Manga, 
	MangapillMangaInfo as MangaInfo, 
	MangapillChapter as MangaChapter, 
	MangapillPagesResponse as MangaPagesResponse 
};

export interface MangaSearchResponse {
	currentPage: number;
	hasNextPage: boolean;
	totalPages: number;
	results: MangapillSearchResult[];
}

export interface MangaSearchState {
	query: string;
	results: MangapillSearchResult[];
	loading: boolean;
	error: string;
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
	hasSearched: boolean; // Track if a search has been executed
}

