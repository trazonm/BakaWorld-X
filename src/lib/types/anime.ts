// Anime-related type definitions
export interface Anime {
	id: string;
	title: string;
	url: string;
	image: string;
	duration: string;
	watchList: string;
	japaneseTitle?: string;
	type: string;
	nsfw: boolean;
	sub: number;
	dub: number;
	episodes: number;
}

export interface AnimeSearchResponse {
	currentPage: number;
	hasNextPage: boolean;
	totalPages: number;
	results: Anime[];
}

export interface AnimeSearchState {
	query: string;
	results: Anime[];
	loading: boolean;
	error: string;
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
}

// Video streaming types for Hakai API
export interface VideoSource {
	url: string;
	isM3U8: boolean;
	type: string;
}

export interface Subtitle {
	url: string;
	lang: string;
}

export interface VideoData {
	headers?: {
		Referer?: string;
	};
	data: {
		intro?: {
			start: number;
			end: number;
		};
		outro?: {
			start: number;
			end: number;
		};
		subtitles: Subtitle[];
		sources: VideoSource[];
	};
}

export interface Episode {
	id: string;
	title: string;
	number: string;
	url?: string;
}
