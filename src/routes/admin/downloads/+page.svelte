<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';

	export let data: PageData;

	let { username: initialUsername } = data;
	
	// Local state that can be updated
	let downloads = data.downloads;
	let totalDownloads = data.totalDownloads;
	let uniqueUsers = data.uniqueUsers;
	let username = initialUsername;

	// Filter and search state
	let searchQuery = '';
	let showDeleteModal = false;
	let selectedDownload: (typeof downloads)[0] | null = null;
	let isDeleting = false;
	let deleteError = '';
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let isPolling = false;

	// Filtered downloads
	$: filteredDownloads = downloads.filter((download) => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			return (
				download.filename?.toLowerCase().includes(query) ||
				download.username.toLowerCase().includes(query) ||
				download.id.toLowerCase().includes(query) ||
				download.status?.toLowerCase().includes(query)
			);
		}
		return true;
	});

	// Update stats when downloads change
	$: {
		totalDownloads = downloads.length;
		uniqueUsers = new Set(downloads.map(d => d.username)).size;
	}

	let lastDeletedId: string | null = null;
	let skipNextPoll = false;

	async function fetchDownloads() {
		if (isPolling) return; // Prevent concurrent requests
		
		try {
			isPolling = true;
			const response = await fetch('/api/admin/downloads');
			if (!response.ok) {
				console.error('Failed to fetch downloads:', response.status);
				return;
			}
			
			const data = await response.json();
			const newDownloads = data.downloads || [];
			
			// If we just deleted something, make sure it's not in the new list
			// If it is, it means deletion hasn't propagated yet - keep our local state
			if (lastDeletedId && newDownloads.some((d: any) => d.id === lastDeletedId)) {
				// Deleted item still exists on server - use our local state (without the deleted item)
				// Don't update, just return
				return;
			}
			
			// Clear the last deleted ID if it's no longer in the server response
			if (lastDeletedId && !newDownloads.some((d: any) => d.id === lastDeletedId)) {
				lastDeletedId = null;
			}
			
			downloads = newDownloads;
		} catch (error) {
			console.error('Error fetching downloads:', error);
		} finally {
			isPolling = false;
		}
	}

	let visibilityHandler: (() => void) | null = null;

	onMount(() => {
		// Start polling every 3 seconds
		pollingInterval = setInterval(() => {
			fetchDownloads();
		}, 3000);

		// Also poll when page becomes visible
		visibilityHandler = () => {
			if (!document.hidden) {
				fetchDownloads();
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	});

	onDestroy(() => {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
		if (visibilityHandler) {
			document.removeEventListener('visibilitychange', visibilityHandler);
			visibilityHandler = null;
		}
	});

	function openDeleteModal(download: typeof downloads[0]) {
		selectedDownload = download;
		deleteError = '';
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		selectedDownload = null;
		deleteError = '';
		isDeleting = false;
	}

	async function confirmDelete() {
		if (!selectedDownload) return;

		isDeleting = true;
		deleteError = '';
		const deletedId = selectedDownload.id;

		try {
			const response = await fetch(`/api/admin/downloads/${selectedDownload.id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: selectedDownload.username
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Failed to delete download' }));
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			// Remove from local list immediately to prevent flicker
			downloads = downloads.filter(d => d.id !== deletedId);
			
			// Track the deleted ID to prevent it from reappearing
			lastDeletedId = deletedId;
			
			closeDeleteModal();
			
			// Refresh after a delay, but fetchDownloads will check if deleted item still exists
			setTimeout(() => {
				fetchDownloads();
			}, 2000);
		} catch (error) {
			console.error('Delete error:', error);
			deleteError = error instanceof Error ? error.message : 'Failed to delete download';
		} finally {
			isDeleting = false;
		}
	}

	function formatProgress(progress: number | undefined): string {
		if (progress === undefined || progress === null) return 'N/A';
		return `${Math.round(progress)}%`;
	}

	function formatFileSize(bytes: number | undefined): string {
		if (!bytes) return 'N/A';
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		if (bytes === 0) return '0 B';
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
	}

	function getStatusColor(status: string | undefined): string {
		if (!status) return 'text-gray-400';
		const s = status.toLowerCase();
		if (s.includes('downloaded') || s.includes('completed') || s === 'done') return 'text-green-400';
		if (s.includes('downloading') || s.includes('progress')) return 'text-blue-400';
		if (s.includes('error') || s.includes('failed')) return 'text-red-400';
		if (s.includes('queued') || s.includes('waiting')) return 'text-yellow-400';
		return 'text-gray-400';
	}
</script>

<svelte:head>
	<title>All User Downloads - Admin Console</title>
</svelte:head>

<div class="min-h-screen py-4 md:py-8 px-2 md:px-4" style="background: linear-gradient(to bottom right, var(--theme-bg-primary), var(--theme-bg-secondary), var(--theme-bg-primary));">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-4 md:mb-8">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
				<div class="flex-1">
					<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
						<h1 class="text-2xl md:text-4xl font-bold text-white">
							📥 All User Downloads
						</h1>
						<div class="flex items-center gap-2">
							<div class="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Live updates active"></div>
							<span class="text-xs text-green-400">Live</span>
						</div>
					</div>
					<p class="text-sm md:text-base text-gray-400">Logged in as <span class="text-blue-400 font-semibold">{username}</span></p>
				</div>
				<div class="flex flex-col sm:flex-row gap-2">
					<a href="/admin" class="px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm md:text-base text-center">
						Admin Dashboard
					</a>
					<a href="/home" class="px-3 md:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm md:text-base text-center">
						← Home
					</a>
				</div>
			</div>

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
				<div class="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 md:p-6 shadow-lg">
					<div class="text-green-100 text-xs md:text-sm font-medium mb-1">Total Downloads</div>
					<div class="text-white text-2xl md:text-3xl font-bold">{totalDownloads}</div>
				</div>
				<div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 md:p-6 shadow-lg">
					<div class="text-blue-100 text-xs md:text-sm font-medium mb-1">Unique Users</div>
					<div class="text-white text-2xl md:text-3xl font-bold">{uniqueUsers}</div>
				</div>
				<div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 md:p-6 shadow-lg">
					<div class="text-purple-100 text-xs md:text-sm font-medium mb-1">Filtered Results</div>
					<div class="text-white text-2xl md:text-3xl font-bold">{filteredDownloads.length}</div>
				</div>
			</div>

			<!-- Search -->
			<div class="backdrop-blur-sm rounded-lg p-3 md:p-4 shadow-lg border" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
				<label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">
					🔍 Search Downloads
				</label>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search by filename, username, ID, or status..."
					class="w-full bg-gray-900 text-white px-3 md:px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm md:text-base"
				/>
			</div>
		</div>

		<!-- Mobile: Card View -->
		<div class="md:hidden space-y-3">
			{#each filteredDownloads as download (download.id)}
				<div class="backdrop-blur-sm rounded-lg border p-4 shadow-lg" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
					<div class="flex items-start justify-between mb-3">
						<div class="flex-1 min-w-0">
							<div class="text-xs text-gray-400 mb-1">User</div>
							<div class="text-sm font-semibold text-white">{download.username}</div>
						</div>
						<div class="flex gap-2 ml-2">
							{#if download.link}
								<a
									href={download.link}
									target="_blank"
									rel="noopener noreferrer"
									class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-xs"
									title="Open download link"
								>
									🔗
								</a>
							{/if}
							<button
								on:click={() => openDeleteModal(download)}
								class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-xs"
								title="Delete download"
							>
								🗑️
							</button>
						</div>
					</div>
					
					<div class="mb-3">
						<div class="text-xs text-gray-400 mb-1">Filename</div>
						<div class="text-sm text-gray-300 break-words" title={download.filename || 'N/A'}>
							{download.filename || 'N/A'}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3 mb-3">
						<div>
							<div class="text-xs text-gray-400 mb-1">Progress</div>
							<div class="text-sm font-medium text-white mb-1">
								{formatProgress(download.progress)}
							</div>
							{#if download.progress !== undefined && download.progress !== null}
								<div class="w-full h-2 bg-gray-700 rounded-full">
									<div
										class="h-2 rounded-full transition-all"
										style="width: {download.progress}%; background: linear-gradient(to right, #3b82f6, #8b5cf6);"
									></div>
								</div>
							{/if}
						</div>
						<div>
							<div class="text-xs text-gray-400 mb-1">Status</div>
							<span class="text-sm font-medium {getStatusColor(download.status)}">
								{download.status || 'N/A'}
							</span>
						</div>
					</div>

					<div>
						<div class="text-xs text-gray-400 mb-1">Torrent ID</div>
						<div class="text-xs text-gray-400 font-mono break-all" title={download.id}>
							{download.id}
						</div>
					</div>
				</div>
			{:else}
				<div class="backdrop-blur-sm rounded-lg border p-8 text-center" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
					<p style="color: var(--theme-text-secondary);">No downloads found.</p>
				</div>
			{/each}
		</div>

		<!-- Desktop: Table View -->
		<div class="hidden md:block backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b" style="background-color: var(--theme-bg-primary); border-color: var(--theme-border);">
						<tr>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-300">User</th>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-300">Filename</th>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-gray-300">Progress</th>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-300">Status</th>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-300 hidden lg:table-cell">Torrent ID</th>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-gray-300">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y" style="border-color: var(--theme-border);">
						{#each filteredDownloads as download (download.id)}
							<tr class="admin-table-row transition-colors">
								<td class="px-4 lg:px-6 py-3 md:py-4">
									<div class="text-xs md:text-sm font-semibold text-white">{download.username}</div>
								</td>
								<td class="px-4 lg:px-6 py-3 md:py-4">
									<div class="text-xs md:text-sm text-gray-300 max-w-md truncate" title={download.filename || 'N/A'}>
										{download.filename || 'N/A'}
									</div>
								</td>
								<td class="px-4 lg:px-6 py-3 md:py-4 text-center">
									<div class="text-xs md:text-sm font-medium" style="color: var(--theme-text-primary);">
										{formatProgress(download.progress)}
									</div>
									{#if download.progress !== undefined && download.progress !== null}
										<div class="w-20 md:w-24 h-2 bg-gray-700 rounded-full mx-auto mt-1">
											<div
												class="h-2 rounded-full transition-all"
												style="width: {download.progress}%; background: linear-gradient(to right, #3b82f6, #8b5cf6);"
											></div>
										</div>
									{/if}
								</td>
								<td class="px-4 lg:px-6 py-3 md:py-4">
									<span class="text-xs md:text-sm font-medium {getStatusColor(download.status)}">
										{download.status || 'N/A'}
									</span>
								</td>
								<td class="px-4 lg:px-6 py-3 md:py-4 hidden lg:table-cell">
									<div class="text-xs text-gray-400 font-mono max-w-xs truncate" title={download.id}>
										{download.id}
									</div>
								</td>
								<td class="px-4 lg:px-6 py-3 md:py-4">
									<div class="flex gap-2 justify-end">
										{#if download.link}
											<a
												href={download.link}
												target="_blank"
												rel="noopener noreferrer"
												class="px-2 md:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs md:text-sm font-medium"
												title="Open download link"
											>
												🔗
											</a>
										{/if}
										<button
											on:click={() => openDeleteModal(download)}
											class="px-2 md:px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs md:text-sm font-medium"
											title="Delete download"
										>
											🗑️ Delete
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-6 py-12 text-center" style="color: var(--theme-text-secondary);">
									No downloads found.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Delete Download Modal -->
{#if showDeleteModal && selectedDownload}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
		<div class="relative w-full max-w-md rounded-lg border border-red-700 p-4 md:p-6 shadow-2xl" style="background-color: var(--theme-bg-primary);">
			<button
				class="absolute top-2 right-2 text-2xl text-gray-400 hover:text-white"
				on:click={closeDeleteModal}
				disabled={isDeleting}
			>&times;</button>
			<h2 class="text-2xl font-bold text-red-400 mb-4">⚠️ Delete Download</h2>
			<p class="text-gray-300 mb-2">
				Are you sure you want to delete this download?
			</p>
			<div class="bg-gray-800 rounded-lg p-4 mb-4 space-y-2 text-sm">
				<div><span class="text-gray-400">User:</span> <span class="text-white font-semibold">{selectedDownload.username}</span></div>
				<div><span class="text-gray-400">Filename:</span> <span class="text-white">{selectedDownload.filename || 'N/A'}</span></div>
				<div><span class="text-gray-400">ID:</span> <span class="text-white font-mono text-xs">{selectedDownload.id}</span></div>
			</div>
			<p class="text-red-300 font-semibold mb-6">
				This will delete the torrent from both Real Debrid and the database. This action cannot be undone!
			</p>

			{#if deleteError}
				<div class="mb-4 rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-red-200 text-sm">
					✗ {deleteError}
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					type="button"
					on:click={closeDeleteModal}
					class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={confirmDelete}
					class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete Download'}
				</button>
			</div>
		</div>
	</div>
{/if}

