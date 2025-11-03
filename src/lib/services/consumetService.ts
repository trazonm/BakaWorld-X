// Centralized Consumet API service for anime and manga
import { config } from '$lib/config';
import type { Anime, Episode } from '$lib/types/anime';

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
		this.baseUrl = baseUrl || config.consumet.baseUrl;
	}

	/**
	 * Search for anime
	 */
	async searchAnime(query: string, provider: string = 'zoro', page: number = 1): Promise<ConsumetSearchResponse<Anime>> {
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
	 * Get anime info by ID
	 * Route: /anime/zoro/info?id={id}
	 */
	async getAnimeInfo(animeId: string, provider: string = 'zoro'): Promise<ConsumetAnimeInfo> {
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
	 * Route: /anime/zoro/watch?episodeId={episodeId}&server={serverName}
	 * Valid servers: "vidcloud", "streamsb", "vidstreaming", "streamtape"
	 */
	async getEpisodeStreamingLinks(
		episodeId: string,
		provider: string = 'zoro',
		server: string = 'vidcloud'
	): Promise<ConsumetWatchResponse> {
		// Map old server names to Consumet server names if needed
		const serverMap: Record<string, string> = {
			'hd-1': 'vidcloud',
			'hd-2': 'vidcloud',
			'hd-3': 'streamsb'
		};
		const mappedServer = serverMap[server] || server;
		
		// According to Consumet docs, episodeId should be a query parameter, not in the path
		// Route: /anime/zoro/watch?episodeId={episodeId}&server={server}
		const url = `${this.baseUrl}/anime/${provider}/watch?episodeId=${encodeURIComponent(episodeId)}&server=${mappedServer}`;
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
	 * Get available servers for an episode
	 */
	async getEpisodeServers(episodeId: string, provider: string = 'zoro'): Promise<string[]> {
		const url = `${this.baseUrl}/anime/${provider}/servers/${encodeURIComponent(episodeId)}`;
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

