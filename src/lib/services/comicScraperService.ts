// Comic scraping service for readcomicsonline.ru
import * as cheerio from 'cheerio';
import type { Comic, ComicIssue, ComicPagesResponse, ComicPage } from '$lib/types/comic';

const BASE_URL = 'https://readcomicsonline.ru';

class ComicScraperService {
	private async fetchHtml(url: string): Promise<string> {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'Referer': BASE_URL,
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
		}

		return await response.text();
	}

	/**
	 * Search for comics
	 * URL: https://readcomicsonline.ru/search?query=batman
	 */
	async searchComics(query: string, page: number = 1): Promise<{
		currentPage: number;
		hasNextPage: boolean;
		totalPages: number;
		totalResults: number;
		results: Comic[];
	}> {
		const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}`;
		console.log('ComicScraperService - Search URL:', url);
		
		// The search endpoint returns JSON, not HTML
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'application/json, text/plain, */*',
				'Accept-Language': 'en-US,en;q=0.9',
				'Referer': BASE_URL,
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		
		if (!data.suggestions || !Array.isArray(data.suggestions)) {
			return {
				currentPage: page,
				hasNextPage: false,
				totalPages: 1,
				totalResults: 0,
				results: []
			};
		}
		
		// Convert suggestions to Comic format
		// Cover images follow pattern: /uploads/manga/{slug}/cover/cover_250x350.jpg
		const comics: Comic[] = data.suggestions.map((suggestion: any) => {
			const comicSlug = suggestion.data || suggestion.value.toLowerCase().replace(/\s+/g, '-');
			const coverImage = comicSlug 
				? `${BASE_URL}/uploads/manga/${comicSlug}/cover/cover_250x350.jpg`
				: '';
			
			return {
				id: comicSlug,
				title: suggestion.value || '',
				image: coverImage,
				description: null,
				publisher: null,
				startYear: null,
				issueCount: null,
			};
		});
		
		return {
			currentPage: 1,
			hasNextPage: false,
			totalPages: 1,
			totalResults: comics.length,
			results: comics
		};
	}

	/**
	 * Get comic info and chapters
	 * URL: https://readcomicsonline.ru/comic/batman-2016
	 */
	async getComicInfo(comicSlug: string): Promise<Comic & { issues: ComicIssue[] }> {
		const url = `${BASE_URL}/comic/${comicSlug}`;
		console.log('ComicScraperService - Get comic info URL:', url);
		
		const html = await this.fetchHtml(url);
		const $ = cheerio.load(html);
		
		// Extract comic title - the h1 contains the site logo, so we need to find the actual comic title
		// Try extracting from page title first (most reliable)
		let title = '';
		const pageTitle = $('title').text();
		if (pageTitle) {
			// Page title format: "Batman (2016-) by Tom King - Info Page" 
			// or "All-Star Batman (2016-) by Scott Snyder - Info Page"
			// Extract everything before " by " (which is the author separator)
			const byMatch = pageTitle.match(/^(.+?)\s+by\s+/i);
			if (byMatch) {
				title = byMatch[1].trim();
			} else {
				// If no " by ", try to extract before " - Info Page" or " | "
				const infoPageMatch = pageTitle.match(/^(.+?)(?:\s+-\s+Info\s+Page|\s*\|\s*)/i);
				if (infoPageMatch) {
					title = infoPageMatch[1].trim();
				} else {
					// Last resort: split on " - " but only if followed by "Info" or capital word
					const parts = pageTitle.split(/\s+-\s+(?:Info|Page|\|)/i);
					if (parts.length > 0) {
						title = parts[0].trim();
					}
				}
			}
		}
		
		// Fallback: try to find comic title in various elements (but skip h1 which has site logo)
		if (!title) {
			title = $('.comic-title, .series-title, .manga-title, h2.comic-title, .title-info').first().text().trim();
		}
		
		// If still no title, look for breadcrumb or any text that contains the slug
		if (!title || title.includes('Read Comics Online')) {
			// Find text near cover image or in main content area
			const mainContent = $('.container-fluid, .main-content, .content').first();
			const allText = mainContent.text();
			// Look for the slug pattern converted to readable title
			title = comicSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
		}
		
		// Extract description
		const description = $('.description, .comic-description, .summary, p.description, .manga-summary').first().text().trim() || null;
		
		// Extract cover image - use the known pattern as primary, then try to scrape
		let imageUrl = `${BASE_URL}/uploads/manga/${comicSlug}/cover/cover_250x350.jpg`;
		
		// Try to find cover image in HTML as fallback
		const coverImg = $('img[src*="cover"], img[alt*="cover"], .comic-cover img, .cover img').first();
		const imageSrc = coverImg.attr('src') || coverImg.attr('data-src') || '';
		if (imageSrc && (imageSrc.includes('cover') || imageSrc.includes('poster'))) {
			const img = imageSrc.startsWith('http') 
				? imageSrc 
				: (imageSrc.startsWith('//') 
					? 'https:' + imageSrc 
					: BASE_URL + imageSrc);
			imageUrl = img;
		}
		
		// Extract chapters/issues
		const issues: ComicIssue[] = [];
		
		// Look for chapter links
		$('a[href*="/comic/' + comicSlug + '/"]').each((_, element) => {
			const $el = $(element);
			const href = $el.attr('href');
			
			if (href) {
				// Extract chapter number from URL like /comic/batman-2016/1
				const match = href.match(/\/comic\/[^\/]+\/(\d+)/);
				if (match) {
					const issueNumber = match[1];
					const issueTitle = $el.text().trim() || `Issue ${issueNumber}`;
					
					issues.push({
						id: issueNumber,
						issueNumber: issueNumber,
						title: issueTitle !== `Issue ${issueNumber}` ? issueTitle : undefined,
						description: null,
						image: '',
						coverDate: null,
						storeDate: null,
						volumeId: comicSlug,
						volumeName: title,
					});
				}
			}
		});
		
		// Fallback: look for any numbered links
		if (issues.length === 0) {
			$('.chapter-list a, .issue-list a, .episode-list a, ul li a').each((_, element) => {
				const $el = $(element);
				const href = $el.attr('href');
				const text = $el.text().trim();
				
				if (href && href.includes(`/comic/${comicSlug}/`)) {
					const match = href.match(/\/comic\/[^\/]+\/(\d+)/);
					if (match) {
						const issueNumber = match[1];
						
						if (!issues.find(i => i.id === issueNumber)) {
							issues.push({
								id: issueNumber,
								issueNumber: issueNumber,
								title: text || undefined,
								description: null,
								image: '',
								coverDate: null,
								storeDate: null,
								volumeId: comicSlug,
								volumeName: title,
							});
						}
					}
				}
			});
		}
		
		// Sort issues by number (descending - newest first typically)
		issues.sort((a, b) => parseInt(b.issueNumber) - parseInt(a.issueNumber));
		
		return {
			id: comicSlug,
			title: title,
			description: description,
			image: imageUrl,
			publisher: null,
			startYear: null,
			issueCount: issues.length,
			issues: issues
		};
	}

	/**
	 * Get comic pages for a chapter
	 * URL: https://readcomicsonline.ru/comic/batman-2016/1
	 */
	async getComicPages(comicSlug: string, issueNumber: string): Promise<ComicPagesResponse> {
		const url = `${BASE_URL}/comic/${comicSlug}/${issueNumber}`;
		console.log('ComicScraperService - Get comic pages URL:', url);
		
		const html = await this.fetchHtml(url);
		const $ = cheerio.load(html);
		
		const pages: ComicPage[] = [];
		
		// First, check for images in JavaScript - this is common for comic readers
		// The site uses: var pages = [{"page_image":"01.jpg","page_slug":1},...]
		const scriptTags = $('script').toArray();
		for (const script of scriptTags) {
			const content = $(script).html() || '';
			
			// Look for var pages = [...] pattern (readcomicsonline.ru specific)
			const pagesMatch = content.match(/var\s+pages\s*=\s*(\[.*?\]);/s);
			if (pagesMatch) {
				try {
					const pagesArray = JSON.parse(pagesMatch[1]);
					if (Array.isArray(pagesArray)) {
						// Extract base path for images - usually /uploads/manga/{slug}/chapters/{issue}/
						// We'll construct the full URL
						const imageBasePath = `/uploads/manga/${comicSlug}/chapters/${issueNumber}/`;
						
						pagesArray.forEach((pageObj: any, index: number) => {
							const pageImage = pageObj.page_image || pageObj.image || pageObj.src || '';
							if (pageImage) {
								const imgUrl = pageImage.startsWith('http') 
									? pageImage 
									: `${BASE_URL}${imageBasePath}${pageImage}`;
								
								pages.push({
									img: imgUrl,
									page: pageObj.page_slug || pageObj.page || index + 1
								});
							}
						});
						
						if (pages.length > 0) {
							console.log(`ComicScraperService - Found ${pages.length} pages from JavaScript variable`);
							break;
						}
					}
				} catch (e) {
					console.warn('ComicScraperService - Failed to parse pages array:', e);
				}
			}
			
			// Fallback: Look for other patterns
			const patterns = [
				/(?:images|pages|imgs|listImages|pageImages)\s*[=:]\s*(\[.*?\])/s,
				/(?:var|let|const)\s+\w*images?\w*\s*=\s*(\[.*?\])/s,
			];
			
			if (pages.length === 0) {
				for (const pattern of patterns) {
					const arrayMatch = content.match(pattern);
					if (arrayMatch) {
						try {
							const arrayStr = arrayMatch[1];
							const imgUrls = JSON.parse(arrayStr);
							if (Array.isArray(imgUrls)) {
								imgUrls.forEach((url: string, index: number) => {
									if (typeof url === 'string' && url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp'))) {
										const imgUrl = url.startsWith('http') ? url : (url.startsWith('/') ? BASE_URL + url : `${BASE_URL}/${url}`);
										pages.push({
											img: imgUrl,
											page: index + 1
										});
									}
								});
								if (pages.length > 0) break;
							}
						} catch (e) {
							// Continue searching
						}
					}
				}
			}
		}
		
		// If no pages found in JS, look for img tags in common containers
		if (pages.length === 0) {
			// Try various container selectors
			const containers = [
				'.reading-content',
				'.comic-reader',
				'.viewer-content',
				'.container-reader',
				'.chapter-content',
				'.chapter-body',
				'#viewer',
				'#reader',
				'.manga-reader'
			];
			
			for (const container of containers) {
				$(container).find('img').each((index, element) => {
					const $img = $(element);
					const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original') || '';
					
					if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('banner') && 
					    (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
						const imgUrl = src.startsWith('http') ? src : (src.startsWith('/') ? BASE_URL + src : `${BASE_URL}/${src}`);
						
						// Avoid duplicates
						if (!pages.find(p => p.img === imgUrl)) {
							pages.push({
								img: imgUrl,
								page: pages.length + 1
							});
						}
					}
				});
				
				if (pages.length > 0) break;
			}
		}
		
		// Last resort: find all img tags on the page that look like comic pages
		if (pages.length === 0) {
			$('img').each((index, element) => {
				const $img = $(element);
				const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || '';
				
				if (src && 
				    !src.includes('logo') && 
				    !src.includes('icon') && 
				    !src.includes('banner') &&
				    !src.includes('avatar') &&
				    (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp')) &&
				    (src.includes('comic') || src.includes('page') || src.includes('chapter') || src.includes('issue'))) {
					const imgUrl = src.startsWith('http') ? src : (src.startsWith('/') ? BASE_URL + src : `${BASE_URL}/${src}`);
					
					if (!pages.find(p => p.img === imgUrl)) {
						pages.push({
							img: imgUrl,
							page: pages.length + 1
						});
					}
				}
			});
		}
		
		console.log(`ComicScraperService - Found ${pages.length} pages for ${comicSlug}/${issueNumber}`);
		
		if (pages.length === 0) {
			console.warn('ComicScraperService - No pages found, HTML structure may have changed');
			console.warn('ComicScraperService - URL:', url);
		}
		
		return { pages };
	}
}

// Export factory function
export function createComicScraperService() {
	return new ComicScraperService();
}

// Default instance
export const comicScraperService = new ComicScraperService();

