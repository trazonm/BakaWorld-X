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
			// Start polling for any download in 'progress' state (including queued with 0%)
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
			
			// If getTorrentInfo returns empty object, it might be deleted
			if (!data || Object.keys(data).length === 0) {
				// Try to verify by checking if download still exists
				const downloads = await torrentService.getDownloads();
				const downloadExists = downloads.some((d: any) => d.id === id);
				if (!downloadExists) {
					// Download was deleted - clear state
					clearTorrentState(id);
					return;
				}
			}
			
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
						status[id] = { ...status[id], state: 'done', progress: progress };
					} else {
						status[id] = { ...status[id], state: 'progress', progress: progress };
					}
				}
				return { ...status };
			});
		} catch (error: any) {
			// Check if torrent was deleted (404 or unknown_ressource)
			const errorMsg = error?.message?.toLowerCase() || '';
			if (errorMsg.includes('404') || errorMsg.includes('unknown_ressource') || errorMsg.includes('not found')) {
				// Download was deleted - clear state
				clearTorrentState(id);
			} else {
				console.error('Error polling progress for', id, error);
				clearInterval(progressIntervals[id]);
				delete progressIntervals[id];
			}
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
				// Include ALL downloads, even those with 0% progress (queued), so they can be matched by GUID
				downloads.forEach((download) => {
					if (download.id) {
						const existingStatus = status[download.id];
						// Get GUID from existing status or from download object itself
						const guid = existingStatus?.guid || download.guid || '';
						
						// Store progress from database so UI can display it without calling API
						const progress = download.progress || 0;
						
						if (download.progress >= 100 && download.link) {
							newStatus[download.id] = {
								state: 'done',
								guid: guid,
								progress: progress
							};
						} else if (download.progress > 0) {
							newStatus[download.id] = {
								state: 'progress',
								guid: guid,
								progress: progress
							};
						} else {
							// Include queued downloads (0% progress) so they can be matched by GUID
							newStatus[download.id] = {
								state: 'progress', // Use 'progress' state even for queued
								guid: guid,
								progress: progress
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
		// Include ALL downloads, even those with empty or missing GUIDs initially
		downloads.forEach((download: any) => {
			if (!download.id) return; // Skip downloads without ID
			
			// Skip if ID looks like a GUID (not a Real-Debrid torrent ID)
			if (download.id.startsWith('http://') || download.id.startsWith('https://')) {
				console.warn(`Skipping invalid download ID (looks like GUID): ${download.id}`);
				return;
			}
			
			// Get GUID from download object or status store
			const guid = (download.guid || statusStore[download.id]?.guid || '').trim();
			
			// Only map if we have a GUID (empty string won't match, but that's OK)
			if (guid) {
				if (!guidToIdsMap.has(guid)) {
					guidToIdsMap.set(guid, []);
				}
				guidToIdsMap.get(guid)!.push(download.id);
			}
		});
		
		// Also check status store (normalize GUIDs here too)
		Object.entries(statusStore).forEach(([key, status]) => {
			const statusGuid = (status.guid || '').trim();
			if (statusGuid) {
				if (!guidToIdsMap.has(statusGuid)) {
					guidToIdsMap.set(statusGuid, []);
				}
				if (!guidToIdsMap.get(statusGuid)!.includes(key)) {
					guidToIdsMap.get(statusGuid)!.push(key);
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
		// Include ALL downloads regardless of progress - even queued (0%) downloads are valid
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
				// ID exists and is valid, keep it (even if progress is 0%)
				hasValidId = true;
			}
			
			// Check if we have matches by GUID (this handles newly added queued downloads)
			// Normalize GUID comparison (handle empty strings, whitespace, etc.)
			const resultGuid = result.Guid?.trim() || '';
			if (resultGuid && guidToIdsMap.has(resultGuid)) {
				const allIds = guidToIdsMap.get(resultGuid)!;
				const bestId = selectBestId(allIds);
				// Set id if it's valid - this includes queued downloads with 0% progress
				if (validIds.has(bestId)) {
					return { ...result, id: bestId };
				}
				// Even if bestId isn't in validIds yet (race condition), if it's in guidToIdsMap,
				// it means we have a download with this GUID - use the first available ID
				if (allIds.length > 0 && allIds[0]) {
					// Double-check the download exists (match by GUID or ID)
					const downloadExists = downloads.some((d: any) => {
						const downloadGuid = (d.guid || '').trim();
						return d.id === allIds[0] && (downloadGuid === resultGuid || !downloadGuid);
					});
					if (downloadExists) {
						return { ...result, id: allIds[0] };
					}
				}
			}
			
			// If result had a valid id, keep it (including queued downloads with 0% progress)
			// Also, if result has an ID but it's not in validIds, check if it's in the status store
			// This handles cases where the download might be in a transitional state
			if (result.id) {
				if (hasValidId) {
					return result;
				}
				// If ID exists in status store, keep it (might be queued or in transition)
				// Only remove ID if it's definitively not in downloads AND not in status store
				if (statusStore[result.id]) {
					// ID is in status store - keep it even if not in downloads yet (race condition)
					return result;
				}
				// Check if GUID matches any download (might be same download with different ID)
				if (resultGuid && guidToIdsMap.has(resultGuid)) {
					// We have a GUID match, so keep the current ID if it exists
					// Don't remove it - the GUID match will handle updating it if needed
					return result;
				}
			}
			
			// Only remove ID if we're certain there's no match (no valid ID, no GUID match, not in status)
			// This prevents cycling between states
			if (!result.id) {
				// No ID to begin with, return as-is
				return result;
			}
			
			// Return result without id only if we're certain it's invalid
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
