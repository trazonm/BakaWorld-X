// Service layer for torrent-related API calls
import type { TorrentInfo, Download } from '$lib/types';
import { RealDebridService } from './realDebridService';

class TorrentService {
	private torrentInfoCache: Record<string, TorrentInfo> = {};
	private downloadCache: Record<string, Download> = {};

	async getTorrentInfo(id: string): Promise<TorrentInfo> {
		// Don't cache if we're actively polling
		const res = await fetch(`/api/torrents/info/${id}`);
		if (res.ok) {
			const info = await res.json();
			this.torrentInfoCache[id] = info;
			return info;
		}
		return this.torrentInfoCache[id] || {} as TorrentInfo;
	}

	async getDownloads(): Promise<Download[]> {
		const res = await fetch('/api/downloads');
		if (res.ok) {
			const downloads = await res.json();
			downloads.forEach((d: Download) => {
				this.downloadCache[d.id] = d;
			});
			return downloads;
		}
		return [];
	}

	async addMagnet(link: string): Promise<string> {
		const response = await fetch('/api/torrents/magnet', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ link })
		});
		const data = await response.json();
		if (data.id === undefined) throw new Error('Invalid torrent');
		return data.id;
	}

	async addTorrent(link: string): Promise<string> {
		const fileResponse = await fetch(link);
		if (!fileResponse.ok) {
			throw new Error(`Failed to fetch torrent file: ${fileResponse.statusText}`);
		}
		const blob = await fileResponse.blob();
		const formData = new FormData();
		const filename = link.split('/').pop() || 'torrent';
		formData.append('file', blob, filename);
		const response = await fetch('/api/torrents/add', {
			method: 'POST',
			body: formData
		});
		const data = await response.json();
		if (!data?.id && !data?.torrentId) {
			throw new Error('Invalid torrent response');
		}
		return data.id || data.torrentId;
	}

	async getRedirectUrl(link: string): Promise<string> {
		const response = await fetch(`/api/torrents/check?link=${encodeURIComponent(link)}`);
		const data = await response.json();
		return data.finalUrl || link;
	}

	async unrestrictLink(link: string): Promise<string> {
		const res = await fetch('/api/torrents/unrestrict', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ link })
		});
		const data = await res.json();
		return data.download;
	}

	async handleLink(link: string): Promise<string> {
		const baseUrl = 'https://jackett-service.gleeze.com';
		link = link.replace(/http:\/\/192\.168\.0\.107:9117/g, baseUrl);
		if (link.includes('magnet')) return this.addMagnet(link);
		const redirectUrl = await this.getRedirectUrl(link);
		return redirectUrl.includes('magnet') ? this.addMagnet(redirectUrl) : this.addTorrent(link);
	}

	/**
	 * Check if torrents already exist by hash (returns all matches)
	 */
	async checkTorrentExists(magnetLink?: string, hash?: string): Promise<{ 
		exists: boolean; 
		torrent?: any; 
		allTorrents?: any[];
		count?: number;
	}> {
		const response = await fetch('/api/torrents/check-hash', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ magnetLink, hash })
		});
		if (!response.ok) {
			return { exists: false };
		}
		return await response.json();
	}

	/**
	 * Add torrent to queue (background service)
	 * This immediately adds to Real-Debrid and saves to database
	 */
	async addToQueue(result: { MagnetUri?: string; Link?: string; Title?: string; Guid?: string }): Promise<{ id: string; existing: boolean }> {
		const response = await fetch('/api/torrents/queue', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				magnetLink: result.MagnetUri,
				link: result.Link,
				title: result.Title,
				guid: result.Guid
			})
		});
		
		if (!response.ok) {
			let errorMessage = 'Failed to add to queue';
			try {
				const text = await response.text();
				if (text) {
					const error = JSON.parse(text);
					errorMessage = error.error || errorMessage;
					if (error.details) {
						console.error('Queue endpoint error details:', error.details);
					}
				} else {
					errorMessage = `HTTP ${response.status}: ${response.statusText}`;
				}
			} catch (e) {
				errorMessage = `HTTP ${response.status}: ${response.statusText}`;
			}
			throw new Error(errorMessage);
		}
		
		const text = await response.text();
		if (!text) {
			throw new Error('Empty response from queue endpoint');
		}
		
		let data;
		try {
			data = JSON.parse(text);
		} catch (e) {
			throw new Error('Invalid JSON response from queue endpoint');
		}
		
		if (!data.id) {
			throw new Error('Invalid response: missing torrent ID');
		}
		return { id: data.id, existing: data.existing || false };
	}

	/**
	 * Poll progress for all active downloads (background service)
	 */
	async pollProgress(): Promise<void> {
		await fetch('/api/torrents/poll-progress', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});
	}

	clearCache(): void {
		this.torrentInfoCache = {};
		this.downloadCache = {};
	}
}

export const torrentService = new TorrentService();
