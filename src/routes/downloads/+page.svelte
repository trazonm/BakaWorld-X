<!-- Modern Downloads Page using modular components and composables -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { useDownloadManager } from '$lib/composables/useDownloadManager';
	import DownloadsTable from '$lib/components/DownloadsTable.svelte';
	import Toast from '$lib/components/Toast.svelte';

	const downloadManager = useDownloadManager();
	const { downloads, loading, error } = downloadManager;

	let username = '';
	let deduping = false;
	let dedupeMessage = '';
	let toastMessage = '';
	let showToast = false;

	onMount(() => {
		const init = async () => {
			await refreshAuth();
			const { isLoggedIn, username: uname } = get(auth);
			username = uname || '';
			if (!isLoggedIn) {
				goto('/');
				return;
			}

			await downloadManager.fetchDownloads();
			const unsubscribe = downloads.subscribe(downloadList => {
				downloadManager.startPolling(downloadList);
			});

			// Background polling - runs every 5 seconds to update progress in database
			const backgroundPollInterval = setInterval(() => {
				fetch('/api/torrents/poll-progress', { method: 'POST' })
					.then(() => downloadManager.fetchDownloads(true)) // Silent refresh
					.catch(err => console.error('Background polling error:', err));
			}, 5000);

			// Refresh state when page becomes visible
			const handleVisibilityChange = async () => {
				if (!document.hidden) {
					await downloadManager.fetchDownloads(true); // Silent refresh
					// Trigger immediate background poll on visibility
					fetch('/api/torrents/poll-progress', { method: 'POST' })
						.then(() => downloadManager.fetchDownloads(true)) // Silent refresh
						.catch(err => console.error('Background polling error:', err));
				}
			};
			document.addEventListener('visibilitychange', handleVisibilityChange);

			return () => {
				clearInterval(backgroundPollInterval);
				document.removeEventListener('visibilitychange', handleVisibilityChange);
				unsubscribe();
			};
		};
		
		init();
	});

	onDestroy(() => {
		downloadManager.stopAllPolling();
	});

	async function handleDelete(id: string) {
		await downloadManager.deleteDownload(id);
	}

	async function handleDedupe() {
		if (deduping) return;
		
		deduping = true;
		dedupeMessage = '';
		
		try {
			const res = await fetch('/api/downloads/dedupe', { method: 'POST' });
			const data = await res.json();
			
			if (res.ok) {
				dedupeMessage = `Removed ${data.deletedCount} duplicate(s). ${data.keptCount} download(s) remaining.`;
				// Refresh downloads list
				await downloadManager.fetchDownloads();
			} else {
				dedupeMessage = data.error || 'Failed to deduplicate downloads';
			}
		} catch (error) {
			dedupeMessage = 'Error deduplicating downloads';
			console.error('De-duplication error:', error);
		} finally {
			deduping = false;
		}
	}

	function navigateHome() {
		goto('/home');
	}

	function handleToast(event: CustomEvent<{ message: string }>) {
		toastMessage = event.detail.message;
		showToast = true;
	}
</script>

<svelte:head>
	<title>BakaWorld χ - Downloads</title>
</svelte:head>

<main class="text-white">
	<div class="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
			<div>
				<h1 class="text-2xl md:text-3xl font-bold text-white">Downloads</h1>
				<p class="text-gray-400 mt-1 text-sm md:text-base">Manage your active downloads</p>
			</div>
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
				<span class="text-gray-300 text-sm md:text-base hidden sm:inline">Welcome, {username}</span>
				<button
					on:click={handleDedupe}
					disabled={deduping}
					class="px-4 py-2.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm md:text-base min-h-[44px]"
				>
					{deduping ? 'De-Duping...' : 'De-Dupe'}
				</button>
				<button
					on:click={navigateHome}
					class="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors touch-manipulation text-sm md:text-base min-h-[44px]"
				>
					Back to Search
				</button>
			</div>
		</div>

		<!-- De-duplication message -->
		{#if dedupeMessage}
			<div class="mb-4 p-4 rounded-md {dedupeMessage.includes('Removed') ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'}">
				<p class="text-white">{dedupeMessage}</p>
			</div>
		{/if}

		<!-- Downloads Table -->
		<DownloadsTable 
			downloads={$downloads} 
			loading={$loading} 
			error={$error} 
			onDelete={handleDelete}
			on:toast={handleToast}
		/>
	</div>
</main>

<!-- Toast Notification -->
<Toast message={toastMessage} bind:show={showToast} />

