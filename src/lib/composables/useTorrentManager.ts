// Composable for torrent state management
import { get } from 'svelte/store';
import { rowStatusStore } from '$lib/stores/ui';
import { torrentService } from '$lib/services/torrentService';
import { RealDebridService } from '$lib/services/realDebridService';
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
			const validIds = new Set<string>();
			downloads.forEach((download: any) => {
				if (download.id) {
					validIds.add(download.id);
				}
			});
			
			rowStatusStore.update((status) => {
				const newStatus: Record<string, any> = {};
				
				// Only create status entries for downloads that still exist
				downloads.forEach((download) => {
					if (download.id) {
						const existingStatus = status[download.id];
						if (download.progress >= 100 && download.link) {
							newStatus[download.id] = {
								state: 'done',
								guid: existingStatus?.guid || ''
							};
						} else if (download.progress > 0) {
							newStatus[download.id] = {
								state: 'progress',
								guid: existingStatus?.guid || ''
							};
						}
					}
				});
				
				// Preserve GUID-based entries (from search results) but remove deleted Real-Debrid IDs
				// GUID-based entries help map search results to existing downloads
				Object.keys(status).forEach(key => {
					// If it's a valid download ID, it's already handled above
					if (validIds.has(key)) {
						return;
					}
					// If it looks like a GUID (URL or long string), preserve it for search result matching
					if (key.includes('://') || key.length > 40 || key.includes('/')) {
						newStatus[key] = status[key];
					}
					// Otherwise, it's likely a deleted Real-Debrid ID - remove it
				});
				
				return newStatus;
			});
			return downloads;
		} catch (error) {
			console.error('Failed to initialize row status from downloads:', error);
			return [];
		}
	}

	async function updateSearchResultsWithBackendIds(searchResults: SearchResult[], downloads: any[]) {
		if (searchResults.length === 0) return searchResults;
		
		const guidToIdsMap = new Map<string, string[]>(); // Map GUID to ALL matching IDs
		const statusStore = get(rowStatusStore);
		
		// Map downloads to GUIDs (supporting multiple matches per GUID)
		downloads.forEach((download: any) => {
			if (download.guid && download.id) {
				// Skip if ID looks like a GUID (not a Real-Debrid torrent ID)
				// Real-Debrid IDs are typically short alphanumeric strings, not URLs
				if (download.id.startsWith('http://') || download.id.startsWith('https://')) {
					console.warn(`Skipping invalid download ID (looks like GUID): ${download.id}`);
					return;
				}
				
				if (!guidToIdsMap.has(download.guid)) {
					guidToIdsMap.set(download.guid, []);
				}
				guidToIdsMap.get(download.guid)!.push(download.id);
			}
		});
		
		// Also check status store
		Object.entries(statusStore).forEach(([key, status]) => {
			if (status.guid) {
				if (!guidToIdsMap.has(status.guid)) {
					guidToIdsMap.set(status.guid, []);
				}
				if (!guidToIdsMap.get(status.guid)!.includes(key)) {
					guidToIdsMap.get(status.guid)!.push(key);
				}
			}
		});

		// Helper to find best download by ID (prefer completed, then newest)
		function findBestDownloadById(id: string): any | null {
			const download = downloads.find((d: any) => d.id === id);
			if (download) return download;
			// Check if we have status info
			const status = statusStore[id];
			return status ? { id, progress: status.state === 'done' ? 100 : 0 } : null;
		}

		// Helper to select best ID from multiple matches
		function selectBestId(ids: string[]): string {
			// Sort by: completed first, then by newest
			const sorted = ids.map(id => ({ id, download: findBestDownloadById(id) }))
				.sort((a, b) => {
					const aProgress = a.download?.progress || 0;
					const bProgress = b.download?.progress || 0;
					// Prefer completed
					if (aProgress === 100 && bProgress !== 100) return -1;
					if (bProgress === 100 && aProgress !== 100) return 1;
					// Prefer higher progress
					return bProgress - aProgress;
				});
			return sorted[0].id;
		}
		
		// Create a Set of all valid download IDs for quick lookup
		const validIds = new Set<string>();
		downloads.forEach((download: any) => {
			if (download.id && !download.id.startsWith('http://') && !download.id.startsWith('https://')) {
				validIds.add(download.id);
			}
		});
		
		// Only check by GUID from existing downloads (no hash checking)
		const resultsWithIds = searchResults.map((result) => {
			// First, check if result has an existing id - verify it's still valid
			let hasValidId = false;
			if (result.id && validIds.has(result.id)) {
				// ID exists and is valid, keep it
				hasValidId = true;
			}
			
			// Check if we have matches by GUID
			if (result.Guid && guidToIdsMap.has(result.Guid)) {
				const allIds = guidToIdsMap.get(result.Guid)!;
				const bestId = selectBestId(allIds);
				// Only set id if it's still valid
				if (validIds.has(bestId)) {
					return { ...result, id: bestId };
				}
			}
			
			// If result had a valid id, keep it; otherwise remove it
			if (hasValidId) {
				return result;
			}
			
			// Return result without id if no valid match found
			const { id, ...resultWithoutId } = result;
			return resultWithoutId as SearchResult;
		});
		
		return resultsWithIds;
	}

	async function handleAddToQueue(result: SearchResult): Promise<string | null> {
		const tempKey = result.id || result.Guid || result.Title || '';
		
		// Set initial "adding" state
		rowStatusStore.update(status => ({
			...status,
			[tempKey]: { state: 'adding', guid: result.Guid }
		}));

		try {
			// Use the new queue endpoint which handles checking existing torrents
			const response = await torrentService.addToQueue(result);
			if (!response || !response.id) {
				throw new Error('Invalid response from queue endpoint');
			}
			const { id, existing } = response;
			
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
				
				// Check if already completed
				const downloads = torrentService.getDownloads();
				downloads.then(downloadsList => {
					const download = downloadsList.find((d: any) => d.id === id);
					if (download && download.progress >= 100 && download.link) {
						rowStatusStore.update(s => ({
							...s,
							[id]: { state: 'done', guid: result.Guid }
						}));
						return;
					}
					
					rowStatusStore.update(s => ({
						...s,
						[id]: {
							state: existing && download?.progress >= 100 ? 'done' : 'progress',
							guid: result.Guid,
						},
					}));
				});
				
				return {
					...store,
					[id]: {
						state: 'progress',
						guid: result.Guid,
					},
				};
			});

			// Start polling for this torrent (client-side for UI updates)
			if (!progressIntervals[id]) {
				progressIntervals[id] = setInterval(() => pollProgress(id), 2000);
			}

			// Trigger background polling (server-side)
			torrentService.pollProgress().catch(err => {
				console.error('Background polling error:', err);
			});

			return id;
		} catch (err) {
			console.error(`Error adding to queue: ${err}`);
			console.error('Error details:', err);
			const errorMessage = err instanceof Error ? err.message : String(err);
			rowStatusStore.update(status => ({
				...status,
				[tempKey]: { state: 'error', guid: result.Guid, error: errorMessage }
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
		
		// Remove from state store (by ID and also by GUID)
		rowStatusStore.update(status => {
			const newStatus = { ...status };
			const guidToRemove = status[id]?.guid;
			
			// Remove by ID
			delete newStatus[id];
			
			// Also remove any other entries with the same GUID (cleanup orphaned entries)
			// This handles cases where multiple temp keys were created for the same GUID
			if (guidToRemove) {
				Object.keys(newStatus).forEach(key => {
					if (newStatus[key]?.guid === guidToRemove && key !== id) {
						delete newStatus[key];
					}
				});
			}
			
			return newStatus;
		});
	}

	return {
		startProgressPolling,
		stopAllProgressPolling,
		initializeRowStatusFromDownloads,
		updateSearchResultsWithBackendIds,
		handleAddToQueue,
		clearTorrentState,
		extractHashFromMagnet: RealDebridService.extractHashFromMagnet,
		pollProgress: async () => {
			// Poll all active torrents from server
			await torrentService.pollProgress();
		}
	};
}
