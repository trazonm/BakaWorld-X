// Comic-related type definitions
export interface ComicVineVolume {
	id: string;
	api_detail_url: string;
	name: string;
	description?: string | null;
	image?: {
		icon_url?: string;
		medium_url?: string;
		screen_url?: string;
		screen_large_url?: string;
		small_url?: string;
		super_url?: string;
		thumb_url?: string;
		tiny_url?: string;
		original_url?: string;
		image_tags?: string;
	} | null;
	publisher?: {
		id: string;
		name: string;
	} | null;
	start_year?: string;
	count_of_issues?: number;
	date_added?: string;
	date_last_updated?: string;
}

export interface ComicVineIssue {
	id: string;
	api_detail_url: string;
	issue_number: string;
	name?: string;
	description?: string | null;
	image?: {
		icon_url?: string;
		medium_url?: string;
		screen_url?: string;
		screen_large_url?: string;
		small_url?: string;
		super_url?: string;
		thumb_url?: string;
		tiny_url?: string;
		original_url?: string;
		image_tags?: string;
	} | null;
	volume: {
		id: string;
		name: string;
		api_detail_url: string;
	};
	cover_date?: string;
	store_date?: string;
	date_added?: string;
	date_last_updated?: string;
}

export interface ComicVineSearchResponse<T> {
	error: string;
	limit: number;
	offset: number;
	number_of_page_results: number;
	number_of_total_results: number;
	status_code: number;
	results: T[];
	version: string;
}

export interface Comic {
	id: string;
	title: string;
	description?: string | null;
	image?: string;
	publisher?: string;
	startYear?: string;
	issueCount?: number;
	volume?: ComicVineVolume;
	issues?: ComicIssue[];
}

export interface ComicIssue {
	id: string;
	issueNumber: string;
	title?: string;
	description?: string | null;
	image?: string;
	coverDate?: string;
	storeDate?: string;
	volumeId: string;
	volumeName: string;
}

export interface ComicPagesResponse {
	pages: ComicPage[];
}

export interface ComicPage {
	img: string;
	page: number;
}

export interface ComicSearchState {
	query: string;
	results: Comic[];
	loading: boolean;
	error: string;
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
	hasSearched: boolean;
}

