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
		'anyways.',
		"you're here. neat.",
		'hydrate or dont im not ur mom',
		"we're so back (probably)",
		'my tabs are basically furniture now',
		'wifi said no and i respect the honesty',
		'gojo would scroll this at 3am',
		'luffy would 100% lose the remote on purpose',
		'namek exploded again lol (monday)',
		'vegeta judging my queue from the sidelines',
		'if it works its canon idc',
		'this runs on spite and decent bandwidth',
		'chi-chi yelling at the ui same energy',
		'frieza five minutes = my entire afternoon',
		'eren would simply uninstall the problem',
		'light yagami with a sticky note vs me with a todo list',
		'power levels fake snacks real',
		'one piece is long. so is this week.',
		'jjk brain rot acquired legally',
		'chainsaw man said read the fine print. i didnt.',
		'behold: a loading bar with main character syndrome',
		'brain empty just vibes',
		'its always tuesday somewhere',
		'me vs the back button (im losing)',
		'cooked. not in a good way. maybe in a good way.',
		'no thoughts just pixels',
		'certified silliness',
		'peak behavior (delusional)',
		'ok but what if we didnt',
		'girlboss gaslight gatekeep (jk please be normal)',
		'sigma male grindset (i took a nap)',
		'skibidi ohio rizz (jk)',
		'touch grass later we busy',
		'slay the day or slay minimally',
		'ratio + L + ur router fell off',
		'mewing while reading this? iconic.',
		'rent free in my own head first',
		'gyatt (this means nothing)',
		'fr fr on god no cap (sorry)',
		'anime was a mistake - jk we love it here',
		'dragon ball zed more like dragon ball zzz',
		'naruto run to the fridge type day',
		'goku would share his food. would you.',
		'piccolo babysitting energy loading…',
		'buu ate the cookies. it was me. i was buu.'
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
			}, 1000);

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
			}, 1000);
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

<main
	class="relative z-[1] flex min-h-[calc(100vh-5rem)] w-full flex-col items-center justify-center bg-transparent px-4 py-20 sm:px-6 sm:py-24 md:py-28"
>
	<div class="mx-auto w-full max-w-2xl">
		<header class="flex flex-col items-center text-center">
			<!-- <p
				class="text-lg font-semibold uppercase leading-none tracking-[0.2em] text-zinc-300 antialiased sm:text-xl md:text-2xl md:tracking-[0.22em]"
			>
				BakaWorld&nbsp;χ
			</p> -->

			<h1
				class="mt-6 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-zinc-50 sm:mt-8 sm:text-4xl sm:leading-[1.12] md:mt-10 md:text-5xl md:leading-[1.08]"
			>
				Welcome back, <span class="text-theme-accent">{username}</span>
			</h1>

			<div class="mt-5 w-full max-w-full sm:mt-6 md:mt-8">
				<p
					class="inline-block w-max max-w-full overflow-x-auto whitespace-nowrap px-1 text-center text-sm leading-normal text-zinc-400 [scrollbar-width:thin] sm:text-base md:text-base [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15"
				>
					{tagline}
				</p>
			</div>
		</header>

		<section class="mt-12 w-full sm:mt-14 md:mt-20" aria-label="Torrent search">
			<label for="home-torrent-search" class="sr-only">Search torrents by keyword</label>
			<form
				class="flex w-full flex-col gap-2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-2 shadow-xl shadow-black/25 ring-1 ring-white/5 backdrop-blur-md sm:flex-row sm:items-stretch sm:gap-2 sm:p-2"
				on:submit={handleSearch}
			>
				<input
					id="home-torrent-search"
					type="search"
					bind:value={searchQuery}
					placeholder="Search torrents…"
					class="min-h-[52px] flex-1 rounded-xl border-0 bg-transparent px-4 py-3.5 text-base text-zinc-50 placeholder:text-zinc-500 transition focus:outline-none focus-visible:ring-0 disabled:opacity-50 sm:min-h-14"
					required
					disabled={searchLoading}
					autocomplete="off"
					enterkeyhint="search"
				/>
				<button
					type="submit"
					class="min-h-[52px] shrink-0 rounded-xl px-8 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:brightness-[0.97] disabled:pointer-events-none disabled:opacity-45 disabled:hover:brightness-100 sm:min-h-14 sm:px-9 sm:text-base"
					style="background-color: var(--theme-accent);"
					disabled={searchLoading}
				>
					{searchLoading ? 'Searching…' : 'Search'}
				</button>
			</form>
		</section>
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
