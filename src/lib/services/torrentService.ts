// Service layer for torrent-related API calls
import type { TorrentInfo, Download } from '$lib/types';

class TorrentService {
	private torrentInfoCache: Record<string, TorrentInfo> = {};
	private downloadCache: Record<string, Download> = {};

	async getTorrentInfo(id: string): Promise<TorrentInfo> {
		if (!this.torrentInfoCache[id]) {
			const res = await fetch(`/api/torrents/info/${id}`);
			if (res.ok) {
				this.torrentInfoCache[id] = await res.json();
			}
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

	clearCache(): void {
		this.torrentInfoCache = {};
		this.downloadCache = {};
	}
}

export const torrentService = new TorrentService();
