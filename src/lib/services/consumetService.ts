// Centralized Consumet API service for anime and manga
import { config } from '$lib/config';
import { getConsumetBaseUrl } from '$lib/server/consumetBaseUrl';
import {
	flattenConsumetSeasons,
	inferSeasonsWhenNumbersRestart,
	normalizeMovieEpisodes,
	sortEpisodes
} from '$lib/server/flixhqPlayback';
import type { Anime, Episode } from '$lib/types/anime';
import type { ConsumetMovie, ConsumetMovieInfo, MovieServerOption } from '$lib/types/movie';

// Get base URL - will be set per request in server endpoints
// For client-side, this service shouldn't be used directly

export interface ConsumetSearchResponse<T> {
	currentPage: number;
	hasNextPage: boolean;
	totalPages?: number;
	totalResults?: number;
	results: T[];
}

export interface ConsumetAnimeInfo extends Omit<Anime, 'episodes'> {
	description?: string;
	genres?: string[];
	rating?: string;
	releaseDate?: string;
	status?: string;
	studios?: string[];
	episodes: Episode[];
}

export interface ConsumetVideoSource {
	url: string;
	quality: string;
	isM3U8?: boolean;
}

export interface ConsumetWatchResponse {
	headers: {
		Referer?: string;
		watchsb?: string | null; // Only provided when server is "streamsb"
		'User-Agent'?: string | null;
	};
	sources: Array<{
		url: string;
		quality: string;
		isM3U8: boolean;
	}>;
	download?: string;
}

/** FlixHQ `/movies/.../watch` may include subtitles */
export interface ConsumetMovieWatchResponse extends ConsumetWatchResponse {
	subtitles?: Array<{ url: string; lang: string }>;
}

function usesPathStyleAnimeWatch(provider: string): boolean {
	return provider === 'animekai';
}

/** Result when AnimeKai watch is resolved after server / dub retries */
export interface AnimeKaiWatchResult {
	watch: ConsumetWatchResponse;
	serverUsed: string;
	dubUsed: boolean;
	dubFallback: boolean;
}

export interface ConsumetManga {
	id: string;
	title: string;
	altTitles?: Array<Record<string, string>> | null; // Array of objects with language keys like { "en": "title" }
	headerForImage?: {
		Referer?: string;
	} | null;
	image: string;
	releaseDate?: number | string | null;
	status?: string;
	contentRating?: string;
	lastVolume?: string | null;
	lastChapter?: string | null;
	description?: string | null;
	genres?: string[] | null;
	authors?: string[] | null;
}

export interface ConsumetMangaInfo extends Omit<ConsumetManga, 'description'> {
	description?: string | Record<string, string> | null; // Can be string or object with language keys
	genres?: string[] | null;
	authors?: string[] | null;
	themes?: string[] | null;
	chapters: ConsumetMangaChapter[];
}

export interface ConsumetMangaChapter {
	id: string;
	title: string;
	chapterNumber: string | number; // API returns string like "3"
	volumeNumber?: string | number;
	number?: number; // Legacy field
	releaseDate?: string;
	pages?: number;
}

export interface ConsumetMangaPage {
	img: string;
	page: number;
}

export interface ConsumetMangaPagesResponse {
	pages: ConsumetMangaPage[];
}

class ConsumetService {
	private baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl = (baseUrl || getConsumetBaseUrl()).replace(/\/$/, '');
	}

	private async requestConsumetJson(pathWithLeadingSlash: string): Promise<unknown> {
		const url = `${this.baseUrl}${pathWithLeadingSlash}`;
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');

		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							resolve(JSON.parse(data));
						} catch (parseError) {
							reject(
								new Error(
									`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown'}`
								)
							);
						}
					} else {
						reject(
							new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${data.substring(0, 300)}`)
						);
					}
				});
			});

			req.on('error', (error: unknown) => {
				const err = error as { message?: string; code?: string };
				reject(new Error(`Network error: ${err.message ?? String(error)} (${err.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * Search for anime
	 */
	async searchAnime(
		query: string,
		provider: string = config.consumet.defaultAnimeProvider,
		page: number = 1
	): Promise<ConsumetSearchResponse<Anime>> {
		const url = `${this.baseUrl}/anime/${provider}/${encodeURIComponent(query)}?page=${page}`;
		console.log('ConsumetService - Anime search URL:', url);
		
		// Use native http/https modules for better compatibility with local IPs
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							resolve({
								currentPage: jsonData.currentPage || page,
								hasNextPage: jsonData.hasNextPage || false,
								totalPages: jsonData.totalPages,
								totalResults: jsonData.totalResults,
								results: jsonData.results || []
							});
						} catch (parseError) {
							reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
						}
					} else {
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${data.substring(0, 200)}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Request error:', {
					message: error.message,
					code: error.code,
					errno: error.errno,
					syscall: error.syscall,
					hostname: error.hostname,
					url: url
				});
				reject(new Error(`Network error connecting to Consumet API: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * Search movies / TV (FlixHQ and other Consumet movie providers).
	 * @see https://docs.consumet.org/rest-api/Movies/flixhq/search
	 */
	async searchMovies(
		query: string,
		provider: string = config.consumet.defaultMovieProvider,
		page: number = 1
	): Promise<ConsumetSearchResponse<ConsumetMovie>> {
		const url = `${this.baseUrl}/movies/${provider}/${encodeURIComponent(query)}?page=${page}`;
		console.log('ConsumetService - Movie search URL:', url);

		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');

		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							resolve({
								currentPage: jsonData.currentPage || page,
								hasNextPage: jsonData.hasNextPage || false,
								totalPages: jsonData.totalPages,
								totalResults: jsonData.totalResults,
								results: jsonData.results || []
							});
						} catch (parseError) {
							reject(
								new Error(
									`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
								)
							);
						}
					} else {
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${data.substring(0, 200)}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Movie search request error:', {
					message: error.message,
					code: error.code,
					url
				});
				reject(new Error(`Network error connecting to Consumet API: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * Movie / TV info (episodes list).
	 * @see https://docs.consumet.org/rest-api/Movies/flixhq/get-movie-info
	 */
	async getMovieInfo(
		mediaId: string,
		provider: string = config.consumet.defaultMovieProvider
	): Promise<ConsumetMovieInfo> {
		const raw = (await this.requestConsumetJson(
			`/movies/${provider}/info?id=${encodeURIComponent(mediaId)}`
		)) as Record<string, unknown> & { episodes?: unknown; seasons?: unknown };
		const id = raw?.id != null ? String(raw.id).trim() : '';
		if (!id) {
			throw new Error('Invalid movie info response');
		}
		const genres = (raw.genres as string[] | undefined) ?? (raw.geners as string[] | undefined);
		const isTv =
			String(raw.type ?? '')
				.toLowerCase()
				.includes('tv') || mediaId.toLowerCase().includes('tv/');

		let episodes;
		const fromSeasons = flattenConsumetSeasons(raw.seasons);
		if (fromSeasons?.length) {
			episodes = sortEpisodes(fromSeasons);
		} else {
			let norm = normalizeMovieEpisodes(raw.episodes);
			if (isTv && !norm.some((e) => e.season != null)) {
				norm = inferSeasonsWhenNumbersRestart(norm);
			}
			episodes = sortEpisodes(norm);
		}

		const { seasons: _s, episodes: _e, ...restRaw } = raw;
		void _s;
		void _e;
		return {
			...(restRaw as unknown as ConsumetMovieInfo),
			id,
			genres,
			episodes
		};
	}

	/**
	 * @see https://docs.consumet.org/rest-api/Movies/flixhq/get-movie-episode-available-servers
	 */
	async getMovieEpisodeServers(
		episodeId: string,
		mediaId: string,
		provider: string = config.consumet.defaultMovieProvider
	): Promise<MovieServerOption[]> {
		const qs = new URLSearchParams({ episodeId, mediaId });
		const raw = await this.requestConsumetJson(`/movies/${provider}/servers?${qs}`);
		return Array.isArray(raw) ? (raw as MovieServerOption[]) : [];
	}

	/**
	 * @see https://docs.consumet.org/rest-api/Movies/flixhq/get-movie-episode-streaming-links
	 */
	async getMovieWatch(
		episodeId: string,
		mediaId: string,
		server: string = 'vidcloud',
		provider: string = config.consumet.defaultMovieProvider
	): Promise<ConsumetMovieWatchResponse> {
		const qs = new URLSearchParams({ episodeId, mediaId, server });
		const raw = (await this.requestConsumetJson(`/movies/${provider}/watch?${qs}`)) as ConsumetMovieWatchResponse;
		if (!raw.sources?.length) {
			throw new Error('No video sources returned');
		}
		return raw;
	}

	/**
	 * FlixHQ often 500s per-server; try Consumet-supported servers in order.
	 * @see https://docs.consumet.org/rest-api/Movies/flixhq/get-movie-episode-streaming-links
	 */
	async getMovieWatchWithFallback(
		episodeId: string,
		mediaId: string,
		provider: string = config.consumet.defaultMovieProvider,
		tryFirst?: string
	): Promise<{ watch: ConsumetMovieWatchResponse; serverUsed: string }> {
		const defaults = ['vidcloud', 'upcloud', 'mixdrop'] as const;
		const first = tryFirst?.toLowerCase().trim();
		let order: string[];
		if (first) {
			if ((defaults as readonly string[]).includes(first)) {
				order = [first, ...defaults.filter((s) => s !== first)];
			} else {
				order = [first, ...defaults];
			}
		} else {
			order = [...defaults];
		}
		const seen = new Set<string>();
		const deduped = order.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));

		let lastError: Error | undefined;
		for (const server of deduped) {
			try {
				const watch = await this.getMovieWatch(episodeId, mediaId, server, provider);
				return { watch, serverUsed: server };
			} catch (e) {
				lastError = e instanceof Error ? e : new Error(String(e));
			}
		}
		throw lastError ?? new Error('Movie watch failed for all servers');
	}

	async getMovieSpotlight(provider: string = config.consumet.defaultMovieProvider): Promise<ConsumetMovie[]> {
		const raw = (await this.requestConsumetJson(`/movies/${provider}/spotlight`)) as { results?: ConsumetMovie[] };
		return raw.results ?? [];
	}

	async getMovieTrending(provider: string = config.consumet.defaultMovieProvider): Promise<ConsumetMovie[]> {
		const raw = (await this.requestConsumetJson(`/movies/${provider}/trending`)) as { results?: ConsumetMovie[] };
		return raw.results ?? [];
	}

	async getMovieRecentMovies(provider: string = config.consumet.defaultMovieProvider): Promise<ConsumetMovie[]> {
		const raw = await this.requestConsumetJson(`/movies/${provider}/recent-movies`);
		return Array.isArray(raw) ? (raw as ConsumetMovie[]) : [];
	}

	async getMovieRecentShows(provider: string = config.consumet.defaultMovieProvider): Promise<ConsumetMovie[]> {
		const raw = await this.requestConsumetJson(`/movies/${provider}/recent-shows`);
		return Array.isArray(raw) ? (raw as ConsumetMovie[]) : [];
	}

	/**
	 * Get anime info by ID
	 * Route: /anime/{provider}/info?id={id}
	 */
	async getAnimeInfo(animeId: string, provider: string = config.consumet.defaultAnimeProvider): Promise<ConsumetAnimeInfo> {
		const url = `${this.baseUrl}/anime/${provider}/info?id=${encodeURIComponent(animeId)}`;
		console.log('ConsumetService - Get anime info URL:', url);
		
		// Use native http/https modules
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							resolve(jsonData);
						} catch (parseError) {
							reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
						}
					} else {
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${data.substring(0, 200)}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Request error:', {
					message: error.message,
					code: error.code,
					url: url
				});
				reject(new Error(`Network error: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * Get episode streaming links
	 * HiAnime-style: /anime/{provider}/watch?episodeId=...&server=...
	 * AnimeKai: /anime/animekai/watch/{episodeId}?server=...&dub=true|false
	 */
	async getEpisodeStreamingLinks(
		episodeId: string,
		provider: string = config.consumet.defaultAnimeProvider,
		server: string = usesPathStyleAnimeWatch(provider) ? 'vidstreaming' : 'vidcloud',
		dub: boolean = false
	): Promise<ConsumetWatchResponse> {
		// Map old server names to Consumet server names if needed
		const serverMap: Record<string, string> = {
			'hd-1': 'vidcloud',
			'hd-2': 'vidcloud',
			'hd-3': 'streamsb'
		};
		const mappedServer = serverMap[server] || server;

		const url = usesPathStyleAnimeWatch(provider)
			? `${this.baseUrl}/anime/${provider}/watch/${encodeURIComponent(episodeId)}?server=${encodeURIComponent(mappedServer)}&dub=${dub}`
			: `${this.baseUrl}/anime/${provider}/watch?episodeId=${encodeURIComponent(episodeId)}&server=${mappedServer}`;
		console.log('ConsumetService - Get episode streaming links URL:', url);
		
		// Use native http/https modules
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							console.log('ConsumetService - Episode streaming response:', JSON.stringify(jsonData, null, 2));
							
							// Validate response structure
							if (!jsonData.sources || !Array.isArray(jsonData.sources)) {
								console.error('ConsumetService - Invalid response structure:', jsonData);
								reject(new Error('Invalid API response: missing or invalid sources array'));
								return;
							}
							
							resolve(jsonData);
						} catch (parseError) {
							console.error('ConsumetService - JSON parse error:', parseError);
							console.error('ConsumetService - Raw response:', data);
							reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
						}
					} else {
						const errorPreview = data.substring(0, 500);
						console.error(`ConsumetService - API error ${res.statusCode}:`, errorPreview);
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${errorPreview}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Request error:', {
					message: error.message,
					code: error.code,
					url: url
				});
				reject(new Error(`Network error: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * AnimeKai often returns 500 when dub is requested but not available, or when a server is down.
	 * Try other servers and fall back sub when dub was requested.
	 */
	async getAnimeKaiWatchWithFallback(
		episodeId: string,
		preferDub: boolean
	): Promise<AnimeKaiWatchResult> {
		const servers = ['vidstreaming', 'vidcloud', 'streamsb'];
		const dubAttempts = preferDub ? [true, false] : [false];
		let lastError: Error | undefined;

		for (const tryDub of dubAttempts) {
			for (const server of servers) {
				try {
					const watch = await this.getEpisodeStreamingLinks(episodeId, 'animekai', server, tryDub);
					return {
						watch,
						serverUsed: server,
						dubUsed: tryDub,
						dubFallback: preferDub && !tryDub
					};
				} catch (e) {
					lastError = e instanceof Error ? e : new Error(String(e));
				}
			}
		}

		throw lastError ?? new Error('AnimeKai watch failed after retries');
	}

	/**
	 * Get available servers for an episode
	 */
	async getEpisodeServers(
		episodeId: string,
		provider: string = config.consumet.defaultAnimeProvider,
		dub: boolean = false
	): Promise<string[]> {
		const url = usesPathStyleAnimeWatch(provider)
			? `${this.baseUrl}/anime/${provider}/servers/${encodeURIComponent(episodeId)}?dub=${dub}`
			: `${this.baseUrl}/anime/${provider}/servers/${encodeURIComponent(episodeId)}`;
		console.log('ConsumetService - Get episode servers URL:', url);
		
		// Use native http/https modules
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							resolve(jsonData.servers || []);
						} catch (parseError) {
							reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
						}
					} else {
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${data.substring(0, 200)}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Request error:', {
					message: error.message,
					code: error.code,
					url: url
				});
				reject(new Error(`Network error: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * Search for manga
	 */
	async searchManga(query: string, provider: string = config.consumet.defaultMangaProvider, page: number = 1): Promise<ConsumetSearchResponse<ConsumetManga>> {
		// Format: /manga/mangadex/{query} (no page parameter - per Consumet API docs)
		const url = `${this.baseUrl}/manga/${provider}/${encodeURIComponent(query)}`;
		console.log('ConsumetService - Manga search URL:', url);
		
		// Use native http/https modules for better compatibility with local IPs
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							console.log('ConsumetService - Manga search response:', JSON.stringify(jsonData, null, 2));
							// According to Consumet docs: { currentPage, hasNextPage, results }
							resolve({
								currentPage: jsonData.currentPage ?? 0,
								hasNextPage: jsonData.hasNextPage ?? false,
								totalPages: jsonData.totalPages ?? 1,
								totalResults: jsonData.totalResults ?? (jsonData.results?.length || 0),
								results: jsonData.results || []
							});
						} catch (parseError) {
							console.error('ConsumetService - JSON parse error:', parseError);
							console.error('ConsumetService - Raw response:', data);
							reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
						}
					} else {
						const errorPreview = data.substring(0, 500);
						console.error(`ConsumetService - API error ${res.statusCode}:`, errorPreview);
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${errorPreview}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Request error:', {
					message: error.message,
					code: error.code,
					errno: error.errno,
					syscall: error.syscall,
					hostname: error.hostname,
					url: url
				});
				reject(new Error(`Network error connecting to Consumet API: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * Get manga info by ID
	 * Route: /manga/mangadex/info/{id} (path parameter, not query)
	 */
	async getMangaInfo(mangaId: string, provider: string = config.consumet.defaultMangaProvider): Promise<ConsumetMangaInfo> {
		// Use path parameter format: /manga/mangadex/info/{id}
		const url = `${this.baseUrl}/manga/${provider}/info/${encodeURIComponent(mangaId)}`;
		console.log('ConsumetService - Get manga info URL:', url);
		
		// Use native http/https modules
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							console.log('ConsumetService - Manga info response:', JSON.stringify(jsonData, null, 2));
							
							// The correct endpoint format should return a single manga object with chapters
							// If it's a direct manga object, use it; otherwise handle legacy formats
							let mangaInfo;
							if (jsonData.id) {
								// Direct manga object
								mangaInfo = jsonData;
							} else if (jsonData.results && Array.isArray(jsonData.results)) {
								// Legacy format: search results
								mangaInfo = jsonData.results.find((m: any) => m.id === mangaId);
								if (!mangaInfo && jsonData.results.length > 0) {
									console.warn(`Manga ID ${mangaId} not found in results, using first result`);
									mangaInfo = jsonData.results[0];
								}
							} else {
								reject(new Error('Invalid API response: manga info not found'));
								return;
							}
							
							if (!mangaInfo) {
								reject(new Error(`Manga with ID ${mangaId} not found`));
								return;
							}
							
							// Ensure chapters array exists (may be missing in some responses)
							if (!mangaInfo.chapters) {
								mangaInfo.chapters = [];
								console.warn(`Manga ${mangaId} has no chapters in API response`);
							}
							
							resolve(mangaInfo);
						} catch (parseError) {
							console.error('ConsumetService - JSON parse error:', parseError);
							console.error('ConsumetService - Raw response:', data);
							reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
						}
					} else {
						const errorPreview = data.substring(0, 500);
						console.error(`ConsumetService - API error ${res.statusCode}:`, errorPreview);
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${errorPreview}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Request error:', {
					message: error.message,
					code: error.code,
					url: url
				});
				reject(new Error(`Network error: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}

	/**
	 * Get manga chapter pages
	 * Route: /manga/mangadex/read/{chapterId} (path parameter)
	 */
	async getMangaChapterPages(
		chapterId: string,
		provider: string = config.consumet.defaultMangaProvider
	): Promise<ConsumetMangaPagesResponse> {
		// Use path parameter format: /manga/mangadex/read/{chapterId}
		const url = `${this.baseUrl}/manga/${provider}/read/${encodeURIComponent(chapterId)}`;
		console.log('ConsumetService - Get manga chapter pages URL:', url);
		
		// Use native http/https modules
		const urlObj = new URL(url);
		const httpModule = urlObj.protocol === 'https:' ? await import('https') : await import('http');
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							console.log('ConsumetService - Manga chapter pages response:', JSON.stringify(jsonData, null, 2));
							
							// Handle different response formats:
							// 1. Direct array: [{img: "...", page: 1}, ...]
							// 2. Wrapped object: {pages: [...]}
							let pages: ConsumetMangaPage[];
							if (Array.isArray(jsonData)) {
								// Direct array response
								pages = jsonData;
							} else if (jsonData.pages && Array.isArray(jsonData.pages)) {
								// Wrapped in pages property
								pages = jsonData.pages;
							} else {
								console.error('ConsumetService - Invalid response structure:', jsonData);
								reject(new Error('Invalid API response: expected array or object with pages array'));
								return;
							}
							
							// Validate pages structure
							if (pages.length === 0) {
								console.warn('ConsumetService - Empty pages array');
							}
							
							resolve({ pages });
						} catch (parseError) {
							console.error('ConsumetService - JSON parse error:', parseError);
							console.error('ConsumetService - Raw response:', data);
							reject(new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
						}
					} else {
						const errorPreview = data.substring(0, 500);
						console.error(`ConsumetService - API error ${res.statusCode}:`, errorPreview);
						reject(new Error(`Consumet API error: ${res.statusCode} ${res.statusMessage} - ${errorPreview}`));
					}
				});
			});

			req.on('error', (error: any) => {
				console.error('ConsumetService - Request error:', {
					message: error.message,
					code: error.code,
					url: url
				});
				reject(new Error(`Network error: ${error.message} (Code: ${error.code || 'N/A'})`));
			});

			req.end();
		});
	}
}

// Export factory function to create service with custom base URL
export function createConsumetService(baseUrl?: string) {
	return new ConsumetService(baseUrl);
}

// Default instance (will be created in server endpoints with env variable)
export const consumetService = new ConsumetService();

