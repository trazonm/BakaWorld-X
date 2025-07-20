// Service layer for download-related API calls
import type { Download, TorrentInfo } from '$lib/types';

class DownloadService {
	private downloadCache: Record<string, Download> = {};

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

	async updateDownload(download: Partial<Download> & { id: string }): Promise<void> {
		await fetch('/api/downloads', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(download)
		});
		
		// Update cache
		if (this.downloadCache[download.id]) {
			this.downloadCache[download.id] = { ...this.downloadCache[download.id], ...download };
		}
	}

	async deleteDownload(id: string): Promise<void> {
		const res = await fetch(`/api/downloads/${id}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			delete this.downloadCache[id];
		}
	}

	async getTorrentProgress(id: string): Promise<TorrentInfo | null> {
		try {
			const res = await fetch(`/api/torrents/info/${id}`);
			if (res.ok) {
				return await res.json();
			}
		} catch (error) {
			console.error('Failed to get torrent progress:', error);
		}
		return null;
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

	clearCache(): void {
		this.downloadCache = {};
	}
}

export const downloadService = new DownloadService();
