// Movies / TV via Consumet FlixHQ (and compatible providers)
// API refs: https://docs.consumet.org/rest-api/Movies/flixhq/search

/** Search hit shape from `/movies/{provider}/{query}` */
export interface ConsumetMovie {
	id: string;
	url: string;
	title: string;
	image: string;
	/** Spotlight uses `cover` instead of `image` */
	cover?: string;
	releaseDate?: string;
	/** e.g. `"Movie"` or TV labels from the provider */
	type?: string;
	description?: string;
	rating?: string;
	duration?: string;
	genres?: string[];
}

export interface MovieEpisode {
	id: string;
	url?: string;
	title: string;
	number: number;
	season?: number;
}

/** `/movies/{provider}/info?id=` — docs use typo `geners`; we accept both */
export interface ConsumetMovieInfo {
	id: string;
	title: string;
	url: string;
	image: string;
	releaseDate?: string;
	description?: string;
	geners?: string[];
	genres?: string[];
	type?: string;
	casts?: string[];
	tags?: string[];
	production?: string;
	duration?: string;
	/**
	 * Some Consumet builds return TV as nested `seasons[]` with `episodes` per season.
	 * We flatten into `episodes` and omit this on the client when possible.
	 */
	seasons?: unknown;
	episodes: MovieEpisode[];
}

export interface MovieServerOption {
	name: string;
	url: string;
}

export interface MovieSearchResponse {
	currentPage: number;
	hasNextPage: boolean;
	/** Present when the provider returns it; otherwise the client infers pages from `hasNextPage`. */
	totalPages?: number;
	results: ConsumetMovie[];
}

export interface MovieSearchState {
	query: string;
	results: ConsumetMovie[];
	loading: boolean;
	error: string;
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
	hasSearched: boolean;
}
