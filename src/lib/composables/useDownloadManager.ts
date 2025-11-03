// Composable for downloads management
import { writable } from 'svelte/store';
import { downloadService } from '$lib/services/downloadService';
import { formatSpeed } from '$lib/utils';
import type { Download } from '$lib/types';
import { useTorrentManager } from './useTorrentManager';

export function useDownloadManager() {
	const downloads = writable<Download[]>([]);
	const loading = writable(true);
	const error = writable('');
	let intervals: Record<string, any> = {};
	let initialLoadComplete = false;
	
	const torrentManager = useTorrentManager();

	async function fetchDownloads(silent = false) {
		try {
			// Only show loading on initial load, not during background refreshes
			if (!silent && !initialLoadComplete) {
				loading.set(true);
			}
			error.set('');
			const downloadsList = await downloadService.getDownloads();
			downloads.set(downloadsList);
			initialLoadComplete = true;
		} catch (e: any) {
			error.set(e.message || 'Unknown error');
			initialLoadComplete = true; // Mark as complete even on error
		} finally {
			// Only set loading to false if we were showing it
			if (!silent) {
				loading.set(false);
			}
		}
	}

	async function fetchProgress(id: string) {
		try {
			const result = await downloadService.getTorrentProgress(id);
			
			// If request failed completely, return early
			if (!result) {
				return;
			}

			// If torrent doesn't exist (404), remove it and stop polling
			if (result.status === 404) {
				console.log(`Torrent ${id} not found (unknown_ressource), removing from UI and stopping polling`);
				// Remove from UI
				downloads.update(currentDownloads => 
					currentDownloads.filter(d => d.id !== id)
				);
				// Stop polling
				if (intervals[id]) {
					clearInterval(intervals[id]);
					delete intervals[id];
				}
				// Try to delete from database (idempotent - if already deleted, that's fine)
				try {
					await downloadService.deleteDownload(id);
				} catch (err) {
					console.warn('Error deleting missing torrent from database:', err);
				}
				return;
			}

			const torrentInfo = result.torrentInfo;
			if (!torrentInfo) {
				// If status is not 404 but torrentInfo is null, might be temporary error
				return;
			}

			downloads.update(currentDownloads => {
				const idx = currentDownloads.findIndex(d => d.id === id);
				if (idx === -1) return currentDownloads;

				const updated = [...currentDownloads];
				if (typeof torrentInfo.progress === 'number') updated[idx].progress = torrentInfo.progress;
				if (typeof torrentInfo.status === 'string') updated[idx].status = torrentInfo.status;
				if (typeof torrentInfo.seeders === 'number') updated[idx].seeders = torrentInfo.seeders;
				if (typeof torrentInfo.speed === 'number') updated[idx].speed = torrentInfo.speed;
				
				// Only update filename if present and not blank
				if (typeof torrentInfo.filename === 'string' && torrentInfo.filename.trim() !== '') {
					updated[idx].filename = torrentInfo.filename;
				}

				return updated;
			});

			// Update the backend
			const currentDownloads = await new Promise<Download[]>(resolve => {
				downloads.subscribe(d => resolve(d))();
			});
			const download = currentDownloads.find(d => d.id === id);
			if (download) {
				await downloadService.updateDownload({
					id,
					...(download.filename ? { filename: download.filename } : {}),
					progress: torrentInfo.progress,
					status: torrentInfo.status,
					seeders: torrentInfo.seeders,
					speed: torrentInfo.speed
				});
			}

			// Handle completion
			if (
				torrentInfo.progress >= 100 &&
				torrentInfo.status === 'downloaded' &&
				torrentInfo.links &&
				torrentInfo.links[0] &&
				download && !download.link
			) {
				const unrestrictedLink = await downloadService.unrestrictLink(torrentInfo.links[0]);
				
				downloads.update(currentDownloads => {
					const idx = currentDownloads.findIndex(d => d.id === id);
					if (idx !== -1) {
						const updated = [...currentDownloads];
						updated[idx] = { ...updated[idx], link: unrestrictedLink };
						return updated;
					}
					return currentDownloads;
				});

				await downloadService.updateDownload({
					id,
					link: unrestrictedLink,
					progress: 100,
					status: 'downloaded',
					...(download.filename ? { filename: download.filename } : {})
				});

				// Stop polling this download
				if (intervals[id]) {
					clearInterval(intervals[id]);
					delete intervals[id];
				}
			}
		} catch (error) {
			console.error('Error fetching progress for', id, error);
		}
	}

	function startPolling(downloads: Download[]) {
		downloads.forEach(download => {
			if (download.progress < 100 && !intervals[download.id]) {
				intervals[download.id] = setInterval(() => fetchProgress(download.id), 2000);
			}
		});
	}

	function stopAllPolling() {
		Object.values(intervals).forEach(clearInterval);
		intervals = {};
	}

	async function deleteDownload(id: string) {
		try {
			await downloadService.deleteDownload(id);
			downloads.update(currentDownloads => 
				currentDownloads.filter(d => d.id !== id)
			);
			
			// Stop polling this download
			if (intervals[id]) {
				clearInterval(intervals[id]);
				delete intervals[id];
			}
			
			// Clear torrent state from search results
			torrentManager.clearTorrentState(id);
		} catch (err) {
			console.error('Error deleting download:', err);
			error.set('Failed to delete download');
		}
	}

	return {
		downloads,
		loading,
		error,
		fetchDownloads,
		deleteDownload,
		startPolling,
		stopAllPolling,
		formatSpeed
	};
}
