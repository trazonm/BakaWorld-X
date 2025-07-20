<!-- Modern Downloads Page using modular components and composables -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { useDownloadManager } from '$lib/composables/useDownloadManager';
	import DownloadsTable from '$lib/components/DownloadsTable.svelte';

	const downloadManager = useDownloadManager();
	const { downloads, loading, error } = downloadManager;

	let username = '';

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

			return unsubscribe;
		};
		
		init();
	});

	onDestroy(() => {
		downloadManager.stopAllPolling();
	});

	async function handleDelete(id: string) {
		await downloadManager.deleteDownload(id);
	}

	function navigateHome() {
		goto('/home');
	}
</script>

<svelte:head>
	<title>BakaWorld X - Downloads</title>
</svelte:head>

<main class="min-h-screen text-white">
	<div class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-bold text-white">Downloads</h1>
				<p class="text-gray-400 mt-1">Manage your active downloads</p>
			</div>
			<div class="flex items-center space-x-4">
				<span class="text-gray-300">Welcome, {username}</span>
				<button
					on:click={navigateHome}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
				>
					Back to Search
				</button>
			</div>
		</div>

		<!-- Downloads Table -->
		<DownloadsTable 
			downloads={$downloads} 
			loading={$loading} 
			error={$error} 
			onDelete={handleDelete} 
		/>
	</div>
</main>
						clearInterval(intervals[d.id]);

