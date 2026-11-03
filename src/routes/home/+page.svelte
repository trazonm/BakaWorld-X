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
	let searchNote = '';
	let username = '';
	let modalSearch = '';
	let searchQuery = '';

	let sortKey: 'Title' | 'Size' | 'Seeders' = 'Seeders';
	let sortDirection: 'asc' | 'desc' = 'desc';

	const torrentManager = useTorrentManager();

	const taglines = [
		'The night market is open.',
		'Pick a title. The queue can mind itself.',
		'Subs, dubs, and the OVA you forgot on purpose.',
		'Torrents from Jackett. Usenet when Prowlarr is awake.',
		'Stay for one episode. You will not.'
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
			}, 12000);

			downloadRefreshInterval = setInterval(async () => {
				const downloads = await torrentManager.initializeRowStatusFromDownloads();
				torrentManager.startProgressPolling();
				if (searchResults.length > 0) {
					searchResults = await torrentManager.updateSearchResultsWithBackendIds(
						searchResults,
						downloads
					);
				}
			}, 2000);
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
		searchNote = '';
		searchResults = [];
		showResultsStore.set(true);

		try {
			const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to fetch search results');
			let results: SearchResult[] = data.Results || [];
			searchNote = Array.isArray(data.warnings) ? data.warnings.filter(Boolean).join(' ') : '';

			results = results.filter((r: SearchResult) => {
				if (r.protocol === 'usenet') return true;
				const seeders = parseInt(r.Seeders?.toString() || '0', 10);
				return seeders >= 5;
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

<main class="den">
	<div class="den__stage">
		<p class="den__seal" aria-hidden="true">バカ</p>
		<header class="den__header">
			<p class="den__kicker">BakaWorld χ</p>
			<h1>Welcome back, <span>{username}</span></h1>
			<p class="den__tagline">{tagline}</p>
		</header>

		<section class="den__search" aria-label="Release search">
			<label for="home-torrent-search" class="sr-only">Search releases by keyword</label>
			<form on:submit={handleSearch}>
				<input
					id="home-torrent-search"
					type="search"
					bind:value={searchQuery}
					placeholder="A title, a season, a whim"
					required
					disabled={searchLoading}
					autocomplete="off"
					enterkeyhint="search"
				/>
				<button type="submit" disabled={searchLoading}>
					{searchLoading ? 'Searching…' : 'Search'}
				</button>
			</form>
			<p class="den__hint">Jackett for torrents. Prowlarr adds Usenet when it is connected.</p>
		</section>
	</div>

	<SearchModal
		results={filteredResults}
		loading={searchLoading}
		error={searchError}
		note={searchNote}
		bind:modalSearch
		{sortKey}
		{sortDirection}
		onSort={handleSort}
		onAddToQueue={handleAddToQueue}
	/>
</main>

<style>
	.den {
		position: relative;
		z-index: 1;
		min-height: calc(100vh - 5rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4.5rem 1.25rem 5rem;
	}
	.den__stage {
		width: min(42rem, 100%);
		position: relative;
	}
	.den__seal {
		position: absolute;
		top: -1.5rem;
		right: 0.25rem;
		margin: 0;
		font-size: 2.4rem;
		line-height: 1;
		color: transparent;
		-webkit-text-stroke: 1.5px rgba(255, 90, 54, 0.85);
		transform: rotate(8deg);
		user-select: none;
	}
	.den__kicker {
		margin: 0;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: var(--theme-accent);
	}
	.den__header h1 {
		margin: 0.7rem 0 0;
		font-size: clamp(2.2rem, 5vw, 3.6rem);
		line-height: 1.02;
		letter-spacing: -0.04em;
		font-weight: 650;
		color: var(--theme-text-primary);
	}
	.den__header h1 span {
		color: var(--theme-accent);
	}
	.den__tagline {
		margin: 0.9rem 0 0;
		max-width: 28rem;
		color: var(--theme-text-secondary);
		font-size: 1.05rem;
	}
	.den__search {
		margin-top: 2.25rem;
	}
	.den__search form {
		display: flex;
		gap: 0.5rem;
		padding: 0.45rem;
		border-radius: 1.1rem;
		background: rgba(18, 8, 12, 0.72);
		border: 1px solid var(--theme-border);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
	}
	.den__search input {
		flex: 1;
		min-height: 3.25rem;
		border: 0;
		background: transparent;
		color: var(--theme-text-primary);
		padding: 0 0.9rem;
		font-size: 1.05rem;
	}
	.den__search input:focus {
		outline: none;
	}
	.den__search button {
		min-height: 3.25rem;
		padding: 0 1.4rem;
		border: 0;
		border-radius: 0.8rem;
		background: var(--theme-accent);
		color: #1a0906;
		font-weight: 700;
		cursor: pointer;
	}
	.den__search button:disabled {
		opacity: 0.55;
		cursor: progress;
	}
	.den__hint {
		margin: 0.75rem 0 0 0.2rem;
		color: var(--theme-text-secondary);
		font-size: 0.82rem;
	}
	@media (max-width: 640px) {
		.den__search form {
			flex-direction: column;
		}
	}
</style>
