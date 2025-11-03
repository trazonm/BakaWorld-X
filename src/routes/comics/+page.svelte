<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { useComicSearch } from '$lib/composables/useComicSearch';
	import ComicSearchForm from '$lib/components/ComicSearchForm.svelte';
	import ComicGrid from '$lib/components/ComicGrid.svelte';

	const comicSearch = useComicSearch();
	const { state } = comicSearch;

	// Local query for input field (doesn't update until search is executed)
	let localQuery = '';
	let lastSearchedQuery = '';

	function handleSearch(event: CustomEvent<{ query: string }>) {
		comicSearch.search(event.detail.query);
	}

	// Restore search from URL query parameter
	onMount(() => {
		const urlQuery = $page.url.searchParams.get('query');
		if (urlQuery && !$state.hasSearched && !$state.loading) {
			localQuery = urlQuery;
			lastSearchedQuery = urlQuery;
			comicSearch.search(urlQuery);
		} else if ($state.query) {
			// Sync local query with state query if available
			localQuery = $state.query;
			lastSearchedQuery = $state.query;
		}
	});

	// Sync local query only when a new search completes (when state query changes after a search)
	$: if ($state.hasSearched && !$state.loading && $state.query !== lastSearchedQuery) {
		lastSearchedQuery = $state.query;
		localQuery = $state.query;
	}
</script>

<svelte:head>
	<title>BakaWorld X - Comics Search</title>
	<meta name="description" content="Search and discover your favorite comic book series" />
</svelte:head>

<style>
	/* Override global overflow for this page only */
	:global(html), :global(body) {
		overflow-y: auto !important;
		height: auto !important;
	}
</style>

<div class="comics-search-container min-h-screen">
	<main class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Header Section -->
		<div class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-4">
				<span class="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
					Comics Search
				</span>
			</h1>
			<p class="text-gray-400 text-lg">Discover your favorite comic book series</p>
		</div>

		<!-- Search Form -->
		<ComicSearchForm 
			bind:query={localQuery} 
			loading={$state.loading} 
			on:search={handleSearch} 
		/>

		<!-- Results Count -->
		{#if $state.results.length > 0 && !$state.loading}
			<div class="text-gray-400 text-center mb-6">
				<span class="text-white font-semibold">{$state.results.length}</span> results found
				{#if $state.query}for "<span class="text-purple-400">{$state.query}</span>"{/if}
				<span class="mx-2">•</span>
				Page <span class="text-white font-semibold">{$state.currentPage}</span> of <span class="text-white font-semibold">{$state.totalPages}</span>
			</div>
		{/if}

		<!-- Search Results -->
		<ComicGrid 
			results={$state.results}
			loading={$state.loading}
			error={$state.error}
			query={$state.query}
			hasSearched={$state.hasSearched}
		/>
	</main>
</div>
