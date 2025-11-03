<script lang="ts">
	import { onMount } from 'svelte';
	import { useAnimeSearch } from '$lib/composables/useAnimeSearch';
	import AnimeSearchForm from '$lib/components/AnimeSearchForm.svelte';
	import AnimeGrid from '$lib/components/AnimeGrid.svelte';
	import AnimePagination from '$lib/components/AnimePagination.svelte';

	const animeSearch = useAnimeSearch();
	const { state } = animeSearch;

	// Local query for input field (doesn't update until search is executed)
	let localQuery = '';
	let lastSearchedQuery = '';

	function handleSearch(event: CustomEvent<{ query: string }>) {
		animeSearch.search(event.detail.query);
	}

	function handlePageChange(event: CustomEvent<{ page: number }>) {
		animeSearch.goToPage(event.detail.page);
	}

	function handleNext() {
		animeSearch.nextPage();
	}

	function handlePrev() {
		animeSearch.prevPage();
	}

	// Sync local query only when a new search completes (when loading goes from true to false)
	$: if ($state.hasSearched && !$state.loading && $state.query !== lastSearchedQuery) {
		lastSearchedQuery = $state.query;
		localQuery = $state.query;
	}
</script>

<svelte:head>
	<title>BakaWorld X - Anime Search</title>
	<meta name="description" content="Search and discover your favorite anime series" />
</svelte:head>

<style>
	/* Override global overflow for this page only */
	:global(html), :global(body) {
		overflow-y: auto !important;
		height: auto !important;
	}
</style>

<div class="anime-search-container">
	<main class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Header Section -->
		<div class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-4">
				<span class="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
					Anime Search
				</span>
			</h1>
			<p class="text-gray-400 text-lg">Discover your favorite anime series</p>
		</div>

		<!-- Search Form -->
		<AnimeSearchForm 
			bind:query={localQuery} 
			loading={$state.loading} 
			on:search={handleSearch} 
		/>

		<!-- Results Count -->
		{#if $state.results.length > 0 && !$state.loading}
			<div class="text-gray-400 text-center mb-6">
				<span class="text-white font-semibold">{$state.results.length}</span> results found
				{#if $state.query}for "<span class="text-blue-400">{$state.query}</span>"{/if}
				<span class="mx-2">•</span>
				Page <span class="text-white font-semibold">{$state.currentPage}</span> of <span class="text-white font-semibold">{$state.totalPages}</span>
			</div>
		{/if}

		<!-- Search Results -->
		<AnimeGrid 
			results={$state.results}
			loading={$state.loading}
			error={$state.error}
			query={$state.query}
			hasSearched={$state.hasSearched}
		/>

		<!-- Pagination -->
		<AnimePagination
			currentPage={$state.currentPage}
			totalPages={$state.totalPages}
			hasNextPage={$state.hasNextPage}
			loading={$state.loading}
			on:page-change={handlePageChange}
			on:next={handleNext}
			on:prev={handlePrev}
		/>
	</main>
</div>
