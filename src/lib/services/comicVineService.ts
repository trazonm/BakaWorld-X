// Comic Vine API service
import { config } from '$lib/config';
import type { ComicVineVolume, ComicVineIssue, ComicVineSearchResponse, Comic, ComicIssue } from '$lib/types/comic';

class ComicVineService {
	private baseUrl: string = 'https://comicvine.gamespot.com/api';
	private apiKey: string;

	constructor(apiKey?: string) {
		// Comic Vine requires an API key (but registration is free)
		// Get it from: https://comicvine.gamespot.com/api/
		this.apiKey = apiKey || config.comicVine?.apiKey || '';
	}

	/**
	 * Search for comic volumes (series)
	 */
	async searchVolumes(query: string, page: number = 1, limit: number = 50): Promise<ComicVineSearchResponse<ComicVineVolume>> {
		const offset = (page - 1) * limit;
		const url = `${this.baseUrl}/search/?api_key=${this.apiKey}&format=json&query=${encodeURIComponent(query)}&resources=volume&field_list=id,name,description,image,publisher,start_year,count_of_issues,api_detail_url,date_added,date_last_updated&limit=${limit}&offset=${offset}`;
		
		console.log('ComicVineService - Volume search URL:', url.replace(this.apiKey, 'API_KEY'));
		
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Comic Vine API error: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();
		
		if (data.error !== 'OK') {
			throw new Error(`Comic Vine API error: ${data.error}`);
		}
		
		return data;
	}

	/**
	 * Get volume details by ID
	 */
	async getVolume(volumeId: string): Promise<ComicVineVolume> {
		const url = `${this.baseUrl}/volume/4050-${volumeId}/?api_key=${this.apiKey}&format=json&field_list=id,name,description,image,publisher,start_year,count_of_issues,api_detail_url,date_added,date_last_updated`;
		
		console.log('ComicVineService - Get volume URL:', url.replace(this.apiKey, 'API_KEY'));
		
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Comic Vine API error: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();
		
		if (data.error !== 'OK') {
			throw new Error(`Comic Vine API error: ${data.error}`);
		}
		
		return data.results;
	}

	/**
	 * Get issues for a volume
	 */
	async getVolumeIssues(volumeId: string, page: number = 1, limit: number = 100): Promise<ComicVineSearchResponse<ComicVineIssue>> {
		const offset = (page - 1) * limit;
		const url = `${this.baseUrl}/issues/?api_key=${this.apiKey}&format=json&filter=volume:${volumeId}&field_list=id,issue_number,name,description,image,volume,cover_date,store_date,api_detail_url,date_added,date_last_updated&limit=${limit}&offset=${offset}&sort=issue_number:asc`;
		
		console.log('ComicVineService - Get volume issues URL:', url.replace(this.apiKey, 'API_KEY'));
		
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Comic Vine API error: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();
		
		if (data.error !== 'OK') {
			throw new Error(`Comic Vine API error: ${data.error}`);
		}
		
		return data;
	}

	/**
	 * Get issue details by ID
	 */
	async getIssue(issueId: string): Promise<ComicVineIssue> {
		const url = `${this.baseUrl}/issue/4000-${issueId}/?api_key=${this.apiKey}&format=json&field_list=id,issue_number,name,description,image,volume,cover_date,store_date,api_detail_url,date_added,date_last_updated`;
		
		console.log('ComicVineService - Get issue URL:', url.replace(this.apiKey, 'API_KEY'));
		
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Comic Vine API error: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();
		
		if (data.error !== 'OK') {
			throw new Error(`Comic Vine API error: ${data.error}`);
		}
		
		return data.results;
	}

	/**
	 * Convert ComicVineVolume to Comic
	 */
	convertVolumeToComic(volume: ComicVineVolume): Comic {
		return {
			id: volume.id,
			title: volume.name,
			description: volume.description || null,
			image: volume.image?.medium_url || volume.image?.thumb_url || volume.image?.icon_url || '',
			publisher: volume.publisher?.name,
			startYear: volume.start_year,
			issueCount: volume.count_of_issues,
			volume: volume
		};
	}

	/**
	 * Convert ComicVineIssue to ComicIssue
	 */
	convertIssueToComicIssue(issue: ComicVineIssue): ComicIssue {
		return {
			id: issue.id,
			issueNumber: issue.issue_number,
			title: issue.name || undefined,
			description: issue.description || null,
			image: issue.image?.medium_url || issue.image?.thumb_url || issue.image?.icon_url || '',
			coverDate: issue.cover_date,
			storeDate: issue.store_date,
			volumeId: issue.volume.id,
			volumeName: issue.volume.name
		};
	}
}

// Export factory function
export function createComicVineService(apiKey?: string) {
	return new ComicVineService(apiKey);
}

// Default instance
export const comicVineService = new ComicVineService();

