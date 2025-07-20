// Composable for torrent state management
import { get } from 'svelte/store';
import { rowStatusStore } from '$lib/stores/ui';
import { torrentService } from '$lib/services/torrentService';
import type { SearchResult } from '$lib/types';

export function useTorrentManager() {
	let progressIntervals: Record<string, any> = {};

	function startProgressPolling() {
		const status = get(rowStatusStore);
		Object.keys(status).forEach(id => {
			if (status[id].state === 'progress' && !progressIntervals[id]) {
				progressIntervals[id] = setInterval(() => pollProgress(id), 2000);
			}
		});
	}

	function stopAllProgressPolling() {
		Object.values(progressIntervals).forEach(clearInterval);
		progressIntervals = {};
	}

	async function pollProgress(id: string) {
		try {
			const data = await torrentService.getTorrentInfo(id);
			const progress = data.progress;
			
			// Save progress to database if we have filename
			if (data.filename && data.filename.trim() !== '') {
				await fetch('/api/downloads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id,
						filename: data.filename,
						progress,
						link: data.links?.[0] || ''
					})
				});
			}
			
			rowStatusStore.update(status => {
				if (status[id]) {
					if (progress >= 100 && data.links && data.links[0]) {
						finalizeDownload(id, data.filename, data.links[0]);
						clearInterval(progressIntervals[id]);
						delete progressIntervals[id];
						status[id] = { ...status[id], state: 'done' };
					} else {
						status[id] = { ...status[id], state: 'progress' };
					}
				}
				return { ...status };
			});
		} catch (error) {
			console.error('Error polling progress for', id, error);
			clearInterval(progressIntervals[id]);
			delete progressIntervals[id];
		}
	}

	async function initializeRowStatusFromDownloads() {
		try {
			const downloads = await torrentService.getDownloads();
			rowStatusStore.update((status) => {
				downloads.forEach((download) => {
					if (download.id) {
						const existingStatus = status[download.id];
						if (download.progress >= 100 && download.link) {
							status[download.id] = {
								state: 'done',
								guid: existingStatus?.guid || ''
							};
						} else if (download.progress > 0) {
							status[download.id] = {
								state: 'progress',
								guid: existingStatus?.guid || ''
							};
						}
					}
				});
				return { ...status };
			});
			return downloads;
		} catch (error) {
			console.error('Failed to initialize row status from downloads:', error);
			return [];
		}
	}

	function updateSearchResultsWithBackendIds(searchResults: SearchResult[], downloads: any[]) {
		if (searchResults.length === 0) return searchResults;
		
		const guidToIdMap = new Map<string, string>();
		const statusStore = get(rowStatusStore);
		
		Object.entries(statusStore).forEach(([key, status]) => {
			if (status.guid) {
				guidToIdMap.set(status.guid, key);
			}
		});
		
		return searchResults.map(result => {
			if (result.Guid && guidToIdMap.has(result.Guid)) {
				const backendId = guidToIdMap.get(result.Guid);
				console.log(`Matched GUID "${result.Guid}" for "${result.Title}" with backend ID: ${backendId}`);
				return { ...result, id: backendId };
			}
			return result;
		});
	}

	async function handleAddToQueue(result: SearchResult): Promise<string | null> {
		const tempKey = result.id || result.Guid || result.Title || '';
		
		// Set initial "adding" state
		rowStatusStore.update(status => ({
			...status,
			[tempKey]: { state: 'adding', guid: result.Guid }
		}));

		try {
			const id = await torrentService.handleLink(result.MagnetUri || result.Link);
			
			// Move state from temp key to backend ID
			rowStatusStore.update((store) => {
				// Remove old temp key if it's different from the new ID
				if (tempKey !== id) {
					delete store[tempKey];
				}
				
				// Also clean up any other potential old keys for this GUID
				if (result.Guid) {
					Object.keys(store).forEach(key => {
						if (store[key].guid === result.Guid && key !== id) {
							delete store[key];
						}
					});
				}
				
				return {
					...store,
					[id]: {
						state: 'progress',
						guid: result.Guid,
					},
				};
			});

			// Start polling for this torrent
			if (!progressIntervals[id]) {
				progressIntervals[id] = setInterval(() => pollProgress(id), 2000);
			}

			return id;
		} catch (err) {
			console.error(`Error adding to queue: ${err}`);
			rowStatusStore.update(status => ({
				...status,
				[tempKey]: { state: 'error', guid: result.Guid }
			}));
			return null;
		}
	}

	async function finalizeDownload(id: string, filename: string, downloadLink: string) {
		const currentStatus = get(rowStatusStore)[id];
		
		if (downloadLink !== 'Invalid Torrent') {
			const finalDownloadLink = await torrentService.unrestrictLink(downloadLink);
			rowStatusStore.update(status => ({
				...status,
				[id]: { state: 'done', guid: currentStatus?.guid || '' }
			}));
			await fetch('/api/downloads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, filename, progress: 100, link: finalDownloadLink })
			});
		} else {
			rowStatusStore.update(status => ({
				...status,
				[id]: { state: 'error', guid: currentStatus?.guid || '' }
			}));
		}
	}

	function clearTorrentState(id: string) {
		// Stop polling for this torrent
		if (progressIntervals[id]) {
			clearInterval(progressIntervals[id]);
			delete progressIntervals[id];
		}
		
		// Remove from state store
		rowStatusStore.update(status => {
			const newStatus = { ...status };
			delete newStatus[id];
			return newStatus;
		});
	}

	return {
		startProgressPolling,
		stopAllProgressPolling,
		initializeRowStatusFromDownloads,
		updateSearchResultsWithBackendIds,
		handleAddToQueue,
		clearTorrentState
	};
}
