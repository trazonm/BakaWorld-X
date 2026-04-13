<script lang="ts">
	import { onMount } from 'svelte';
	import { navigating } from '$app/stores';
	import { useAnimeSearch } from '$lib/composables/useAnimeSearch';
	import AnimeSearchForm from '$lib/components/AnimeSearchForm.svelte';
	import AnimeGrid from '$lib/components/AnimeGrid.svelte';
	import AnimePagination from '$lib/components/AnimePagination.svelte';

	const animeSearch = useAnimeSearch();
	const { state } = animeSearch;
	
	// Check if we're navigating to/from an anime detail page (handles both forward and backward navigation)
	$: isNavigatingToAnime = $navigating !== null && (
		($navigating.to?.url.pathname.startsWith('/anime/') && !$navigating.to?.url.pathname.includes('/watch/')) ||
		($navigating.from?.url.pathname.startsWith('/anime/') && !$navigating.from?.url.pathname.includes('/watch/'))
	);

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

	// One viewport-tall column (no extra scroll) until there is real result chrome below
	$: heroFillView =
		!$state.hasSearched || ($state.loading && $state.results.length === 0);
</script>

<svelte:head>
	<title>BakaWorld χ - Anime Search</title>
	<meta name="description" content="Search and discover your favorite anime series" />
</svelte:head>

<div class="anime-search-container">
	{#if isNavigatingToAnime}
		<!-- Loading Overlay -->
		<div class="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex items-center justify-center">
			<div class="text-center">
				<!-- Spinner -->
				<div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-600 border-t-blue-500 mb-4"></div>
				<p class="text-white text-lg font-medium">Loading anime...</p>
				<p class="text-gray-400 text-sm mt-2">Please wait</p>
			</div>
		</div>
	{/if}
	<main
		class="relative z-[1] flex w-full flex-col {heroFillView
			? 'h-[calc(100dvh-5rem)] overflow-x-hidden overflow-y-hidden'
			: 'min-h-[calc(100dvh-5rem)]'}"
	>
		<section
			class="flex w-full flex-col items-center justify-center px-4 {heroFillView
				? 'min-h-0 flex-1 justify-center py-8 sm:py-10'
				: 'py-12 sm:py-16 md:py-20'}"
		>
			<div class="mx-auto w-full max-w-2xl text-center">
				<div class="mb-6 md:mb-8">
					<h1 class="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-4">
						<span class="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
							Anime Search
						</span>
					</h1>
					<p class="text-gray-400 text-lg">Discover your favorite anime series</p>
				</div>

				<AnimeSearchForm
					bind:query={localQuery}
					loading={$state.loading}
					on:search={handleSearch}
				/>
			</div>
		</section>

		<section class="container mx-auto w-full max-w-7xl shrink-0 px-4 pb-10 pt-4 md:pt-6">
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
		</section>
	</main>
</div>
