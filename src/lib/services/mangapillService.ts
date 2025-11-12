// Mangapill API service using manga-scrapers
// Base URL: https://manga-scrapers.onrender.com/

export interface MangapillSearchResult {
	id: string;
	title: string;
	subheading?: string;
	image: string; // Note: API uses 'image' not 'cover'
	type?: string;
	year?: string;
	status?: string;
}

export interface MangapillMangaInfo {
	id: string; // This comes from the URL, not the response
	title: string;
	description?: string; // Note: API uses 'description' not 'summary'
	image: string; // Note: API uses 'image' not 'cover'
	type?: string;
	status?: string;
	year?: string;
	genres?: string[];
	chapters: MangapillChapter[];
}

export interface MangapillChapter {
	id: string;
	title: string; // e.g., "Chapter 1", "Chapter 2.5"
	// Note: API doesn't provide a separate chapter number field
	// Chapter number must be extracted from title
}

export interface MangapillPage {
	page: number;
	image: string;
}

export interface MangapillPagesResponse {
	pages: MangapillPage[];
}

export interface MangapillSearchResponse {
	results: MangapillSearchResult[];
	currentPage: number;
	hasNextPage: boolean;
	totalPages: number;
}

class MangapillService {
	private baseUrl: string;

	constructor(baseUrl: string = 'https://manga-scrapers.onrender.com') {
		this.baseUrl = baseUrl;
	}

	/**
	 * Search for manga
	 * Route: /mangapill/search/{query}
	 * Response: { status: 200, results: [...] }
	 */
	async searchManga(query: string): Promise<MangapillSearchResponse> {
		const url = `${this.baseUrl}/mangapill/search/${encodeURIComponent(query)}`;
		console.log('MangapillService - Search URL:', url);

		try {
			const response = await fetch(url, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			console.log('MangapillService - Search response:', data);

			// Check if the JSON body indicates an error (e.g., { status: 502, results: [] })
			if (data.status && data.status !== 200) {
				throw new Error(`API error: ${data.status} - Service unavailable`);
			}

			// API returns: { status: 200, results: [...] }
			if (data.results && Array.isArray(data.results)) {
				return {
					results: data.results,
					currentPage: 1,
					hasNextPage: false,
					totalPages: 1
				};
			} else if (Array.isArray(data)) {
				// Fallback for direct array response
				return {
					results: data,
					currentPage: 1,
					hasNextPage: false,
					totalPages: 1
				};
			} else {
				throw new Error('Invalid API response format');
			}
		} catch (error) {
			console.error('MangapillService - Search error:', error);
			throw error;
		}
	}

	/**
	 * Get manga info by ID
	 * Route: /mangapill/info/{id}
	 * Response: { status: 200, results: {...} }
	 */
	async getMangaInfo(mangaId: string): Promise<MangapillMangaInfo> {
		const url = `${this.baseUrl}/mangapill/info/${encodeURIComponent(mangaId)}`;
		console.log('MangapillService - Get info URL:', url);

		try {
			const response = await fetch(url, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			console.log('MangapillService - Info response:', data);

			// Check if the JSON body indicates an error (e.g., { status: 502, results: {} })
			if (data.status && data.status !== 200) {
				throw new Error(`API error: ${data.status} - Service unavailable`);
			}

			// API returns: { status: 200, results: {...} }
			if (data.results) {
				// Add the manga ID to the results (needed for navigation)
				return {
					id: mangaId,
					...data.results
				};
			} else if (data.id || data.title) {
				// Fallback for direct object response
				return data;
			} else {
				throw new Error('Invalid API response format');
			}
		} catch (error) {
			console.error('MangapillService - Get info error:', error);
			throw error;
		}
	}

	/**
	 * Get manga chapter pages
	 * Route: /mangapill/pages/{chapterId}
	 * Response: { status: 200, results: ["url1", "url2", ...] }
	 */
	async getChapterPages(chapterId: string): Promise<MangapillPagesResponse> {
		const url = `${this.baseUrl}/mangapill/pages/${encodeURIComponent(chapterId)}`;
		console.log('MangapillService - Get pages URL:', url);

		try {
			const response = await fetch(url, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			console.log('MangapillService - Pages response:', data);

			// Check if the JSON body indicates an error (e.g., { status: 502, results: [] })
			if (data.status && data.status !== 200) {
				throw new Error(`API error: ${data.status} - Service unavailable`);
			}

			// API returns: { status: 200, results: ["url1", "url2", ...] }
			let imageUrls: string[] = [];
			
			if (data.results && Array.isArray(data.results)) {
				imageUrls = data.results;
			} else if (Array.isArray(data)) {
				// Fallback for direct array response
				imageUrls = data;
			} else {
				throw new Error('Invalid API response format');
			}

			// Convert array of URLs to array of page objects with page numbers
			const pages: MangapillPage[] = imageUrls.map((url, index) => ({
				page: index + 1,
				image: url
			}));

			return { pages };
		} catch (error) {
			console.error('MangapillService - Get pages error:', error);
			throw error;
		}
	}

	/**
	 * Get the newest manga
	 * Route: /mangapill/newest
	 */
	async getNewestManga(): Promise<MangapillSearchResult[]> {
		const url = `${this.baseUrl}/mangapill/newest`;
		console.log('MangapillService - Get newest URL:', url);

		try {
			const response = await fetch(url, {
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'BakaWorld-X/1.0'
				}
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			console.log('MangapillService - Newest response:', data);

			// Check if the JSON body indicates an error (e.g., { status: 502, results: [] })
			if (data.status && data.status !== 200) {
				throw new Error(`API error: ${data.status} - Service unavailable`);
			}

			// Return the results array
			if (Array.isArray(data)) {
				return data;
			} else if (data.results) {
				return data.results;
			} else {
				return [];
			}
		} catch (error) {
			console.error('MangapillService - Get newest error:', error);
			throw error;
		}
	}

	/**
	 * Get proxied manga image URL
	 * Route: /mangapill/images/{encodedImageUrl}
	 */
	getProxiedImageUrl(imageUrl: string): string {
		return `${this.baseUrl}/mangapill/images/${encodeURIComponent(imageUrl)}`;
	}
}

// Export singleton instance
export const mangapillService = new MangapillService();

// Export factory function for custom base URL
export function createMangapillService(baseUrl?: string) {
	return new MangapillService(baseUrl);
}

