<!-- Modern SvelteKit home page using modular components and composables -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { showResultsStore } from '$lib/stores/ui';
	import { useTorrentManager } from '$lib/composables/useTorrentManager';
	import SearchModal from '$lib/components/SearchModal.svelte';
	import type { SearchResult } from '$lib/types';

	let searchResults: SearchResult[] = [];
	let searchLoading = false;
	let searchError = '';
	let username = '';
	let modalSearch = '';

	let sortKey: 'Title' | 'Size' | 'Seeders' = 'Seeders';
	let sortDirection: 'asc' | 'desc' = 'desc';

	const torrentManager = useTorrentManager();

	$: sortedResults = [...searchResults].sort((a, b) => {
		let aVal = a[sortKey];
		let bVal = b[sortKey];
		if (sortKey === 'Size' || sortKey === 'Seeders') {
			aVal = parseFloat(aVal.toString()) || 0;
			bVal = parseFloat(bVal.toString()) || 0;
		}
		if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
		if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
		return 0;
	});

	onMount(() => {
		const init = async () => {
			await refreshAuth();
			const { isLoggedIn, username: uname } = get(auth);
			username = uname || '';
			if (!isLoggedIn) {
				goto('/');
				return;
			}

			await torrentManager.initializeRowStatusFromDownloads();
			torrentManager.startProgressPolling();

			// Refresh state when page becomes visible
			const handleVisibilityChange = async () => {
				if (!document.hidden) {
					await torrentManager.initializeRowStatusFromDownloads();
				}
			};
			document.addEventListener('visibilitychange', handleVisibilityChange);

			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			};
		};
		
		init();
	});

	onDestroy(() => {
		torrentManager.stopAllProgressPolling();
	});

	async function handleSearch(e: Event) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const input = form.querySelector('input[type="text"]') as HTMLInputElement;
		const query = input.value.trim();
		if (!query) return;

		searchLoading = true;
		searchError = '';
		showResultsStore.set(true);

		try {
			const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
			if (!res.ok) throw new Error('Failed to fetch search results');
			const data = await res.json();
			searchResults = data.Results || [];
			
			const downloads = await torrentManager.initializeRowStatusFromDownloads();
			searchResults = torrentManager.updateSearchResultsWithBackendIds(searchResults, downloads);
		} catch (err: any) {
			searchError = err.message || 'Unknown error';
		} finally {
			searchLoading = false;
		}
	}

	function handleSort(key: 'Title' | 'Size' | 'Seeders') {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	async function handleAddToQueue(result: SearchResult) {
		const backendId = await torrentManager.handleAddToQueue(result);
		
		// Update the search results with the new backend ID
		if (backendId) {
			const idx = searchResults.findIndex(r => r.Guid === result.Guid && r.Title === result.Title);
			if (idx !== -1) {
				searchResults[idx] = { ...searchResults[idx], id: backendId };
				searchResults = [...searchResults]; // Trigger reactivity
			}
		}
	}
</script>

<svelte:head>
	<title>BakaWorld X - Home</title>
</svelte:head>

<main class="h-screen flex flex-col items-center justify-center w-screen">
	<div class="flex flex-col items-center justify-center w-screen max-w-3xl mb-40">
		<h1 class="mb-8 text-4xl font-extrabold text-white drop-shadow-lg">Welcome, {username}</h1>
		<form class="flex w-full" on:submit={handleSearch}>
			<input
				type="text"
				placeholder="Search for torrents..."
				class="flex-1 rounded-l bg-gray-900 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
				required
			/>
			<button
				type="submit"
				class="rounded-r bg-blue-700 px-6 py-2 font-semibold text-white hover:bg-blue-800"
			>Search</button>
		</form>
	</div>

	<SearchModal
		results={sortedResults}
		loading={searchLoading}
		error={searchError}
		bind:modalSearch
		{sortKey}
		{sortDirection}
		onSort={handleSort}
		onAddToQueue={handleAddToQueue}
	/>
</main>
