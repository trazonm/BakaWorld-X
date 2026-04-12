<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { tick } from 'svelte';
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
	let searchQuery = '';

	let sortKey: 'Title' | 'Size' | 'Seeders' = 'Seeders';
	let sortDirection: 'asc' | 'desc' = 'desc';

	const torrentManager = useTorrentManager();

	const taglines = [
		'Find what you want. Queue the rest.',
		'Search. Sort. Download.',
		'High seeders. Less waiting.'
	];
	let tagline = '';

	let backgroundPollInterval: ReturnType<typeof setInterval> | undefined;
	let downloadRefreshInterval: ReturnType<typeof setInterval> | undefined;
	let unsubShowResults: (() => void) | undefined;

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

	$: filteredResults = sortedResults.filter(
		(r) => !modalSearch || r.Title?.toLowerCase().includes(modalSearch.trim().toLowerCase())
	);

	function clearHomeIntervals() {
		if (backgroundPollInterval) clearInterval(backgroundPollInterval);
		if (downloadRefreshInterval) clearInterval(downloadRefreshInterval);
		backgroundPollInterval = undefined;
		downloadRefreshInterval = undefined;
	}

	onMount(() => {
		tagline = taglines[Math.floor(Math.random() * taglines.length)] ?? '';

		unsubShowResults?.();
		unsubShowResults = showResultsStore.subscribe((open) => {
			if (!open) {
				searchLoading = false;
			}
		});

		const handleVisibilityChange = async () => {
			if (!document.hidden) {
				await torrentManager.initializeRowStatusFromDownloads();
				if (searchResults.length > 0) {
					const downloads = await torrentManager.initializeRowStatusFromDownloads();
					const updatedResults = await torrentManager.updateSearchResultsWithBackendIds(
						searchResults,
						downloads
					);
					searchResults = updatedResults;
				}
				fetch('/api/torrents/poll-progress', { method: 'POST' }).catch((err) =>
					console.error('Background polling error:', err)
				);
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);

		(async () => {
			await refreshAuth();
			const { isLoggedIn, username: uname } = get(auth);
			username = uname || '';
			if (!isLoggedIn) {
				goto('/');
				return;
			}

			await torrentManager.initializeRowStatusFromDownloads();
			torrentManager.startProgressPolling();

			backgroundPollInterval = setInterval(() => {
				fetch('/api/torrents/poll-progress', { method: 'POST' }).catch((err) =>
					console.error('Background polling error:', err)
				);
			}, 5000);

			downloadRefreshInterval = setInterval(async () => {
				if (searchResults.length > 0) {
					const downloads = await torrentManager.initializeRowStatusFromDownloads();
					const updatedResults = await torrentManager.updateSearchResultsWithBackendIds(
						searchResults,
						downloads
					);
					const nextIds = updatedResults.map((r) => r.id ?? '').join('\0');
					const curIds = searchResults.map((r) => r.id ?? '').join('\0');
					if (nextIds !== curIds) {
						searchResults = updatedResults;
					}
				}
			}, 5000);
		})();

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			clearHomeIntervals();
			unsubShowResults?.();
			unsubShowResults = undefined;
		};
	});

	onDestroy(() => {
		torrentManager.stopAllProgressPolling();
		clearHomeIntervals();
		unsubShowResults?.();
		unsubShowResults = undefined;
	});

	async function handleSearch(e: Event) {
		e.preventDefault();
		const query = searchQuery.trim();
		if (!query) return;

		searchLoading = true;
		searchError = '';
		searchResults = [];
		showResultsStore.set(true);

		try {
			const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
			if (!res.ok) throw new Error('Failed to fetch search results');
			const data = await res.json();
			let results = data.Results || [];

			const minSeeders = 5;
			results = results.filter((r: SearchResult) => {
				const seeders = parseInt(r.Seeders?.toString() || '0', 10);
				return seeders >= minSeeders;
			});

			searchResults = results;
			// Jackett search is done — show the table immediately. Download/GUID hydration can be slow
			// on first load and must not block the modal UI.
			searchLoading = false;
			await tick();

			const downloads = await torrentManager.initializeRowStatusFromDownloads();
			const resultsWithIds = await torrentManager.updateSearchResultsWithBackendIds(results, downloads);
			searchResults = resultsWithIds;
		} catch (err: unknown) {
			searchError = err instanceof Error ? err.message : 'Unknown error';
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

		if (backendId) {
			const idx = searchResults.findIndex((r) => r.Guid === result.Guid && r.Title === result.Title);
			if (idx !== -1) {
				searchResults[idx] = { ...searchResults[idx], id: backendId };
				searchResults = [...searchResults];
			}

			setTimeout(async () => {
				const downloads = await torrentManager.initializeRowStatusFromDownloads();
				const updatedResults = await torrentManager.updateSearchResultsWithBackendIds(
					searchResults,
					downloads
				);
				const targetResult = updatedResults.find((r) => r.Guid === result.Guid);
				if (targetResult && targetResult.id === backendId) {
					searchResults = updatedResults;
				}
			}, 500);
		}
	}
</script>

<svelte:head>
	<title>BakaWorld χ - Home</title>
</svelte:head>

<style>
	.home-main {
		position: relative;
		z-index: 1;
		background: transparent;
	}

	.search-field-home {
		border-color: rgba(236, 72, 153, 0.35);
	}

	.search-field-home:focus-visible {
		outline: none;
		border-color: rgba(236, 72, 153, 0.55);
		box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.2);
	}

	:global([data-theme='dark']) .search-field-home {
		border-color: rgba(14, 165, 233, 0.35);
	}

	:global([data-theme='dark']) .search-field-home:focus-visible {
		border-color: rgba(34, 211, 238, 0.55);
		box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.18);
	}

	.search-cta-home {
		background: linear-gradient(135deg, #db2777, #9333ea, #4338ca);
		border-color: rgba(236, 72, 153, 0.45);
	}

	.search-cta-home:hover {
		filter: brightness(1.06);
	}

	.search-cta-home:active {
		filter: brightness(0.96);
	}

	:global([data-theme='dark']) .search-cta-home {
		background: linear-gradient(135deg, #0284c7, #2563eb, #4338ca);
		border-color: rgba(14, 165, 233, 0.45);
	}
</style>

<main
	class="home-main flex min-h-[calc(100vh-5rem)] w-full flex-col items-center justify-center px-4 py-16"
>
	<div class="w-full max-w-xl">
		<p class="mb-2 text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
			BakaWorld
		</p>
		<h1 class="mb-2 text-center text-3xl font-bold tracking-tight text-white md:text-4xl">
			Welcome back, <span class="text-theme-accent">{username}</span>
		</h1>
		<p class="mb-10 text-center text-sm text-zinc-400 md:text-base">{tagline}</p>

		<form class="flex w-full flex-col gap-3 sm:flex-row sm:gap-0" on:submit={handleSearch}>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search torrents…"
				class="search-field-home min-h-[48px] flex-1 rounded-xl border-2 bg-zinc-900/95 px-4 py-3 text-base text-white placeholder:text-zinc-500 sm:rounded-r-none sm:rounded-l-xl"
				required
				disabled={searchLoading}
				autocomplete="off"
			/>
			<button
				type="submit"
				class="search-cta-home min-h-[48px] rounded-xl border-2 px-6 py-3 text-base font-semibold text-white transition-[filter] duration-150 sm:rounded-l-none sm:rounded-r-xl sm:px-8"
				disabled={searchLoading}
			>
				{searchLoading ? 'Searching…' : 'Search'}
			</button>
		</form>
	</div>

	<SearchModal
		results={filteredResults}
		loading={searchLoading}
		error={searchError}
		bind:modalSearch
		{sortKey}
		{sortDirection}
		onSort={handleSort}
		onAddToQueue={handleAddToQueue}
	/>
</main>
