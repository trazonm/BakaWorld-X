<script lang="ts">
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/stores';
	import { useMovieSearch } from '$lib/composables/useMovieSearch';
	import MovieSearchForm from '$lib/components/MovieSearchForm.svelte';
	import MovieGrid from '$lib/components/MovieGrid.svelte';
	import AnimePagination from '$lib/components/AnimePagination.svelte';

	const movieSearch = useMovieSearch();
	const { state } = movieSearch;

	$: isNavigatingToMovie =
		$navigating !== null &&
		(($navigating.to?.url.pathname.startsWith('/movies/') &&
			!$navigating.to?.url.pathname.includes('/watch/')) ||
			($navigating.from?.url.pathname.startsWith('/movies/') &&
				!$navigating.from?.url.pathname.includes('/watch/')));

	let localQuery = '';
	let lastSearchedQuery = '';

	function handleSearch(event: CustomEvent<{ query: string }>) {
		movieSearch.search(event.detail.query);
	}

	function handlePageChange(event: CustomEvent<{ page: number }>) {
		movieSearch.goToPage(event.detail.page);
	}

	function handleNext() {
		movieSearch.nextPage();
	}

	function handlePrev() {
		movieSearch.prevPage();
	}

	onMount(() => {
		const urlQuery = $page.url.searchParams.get('query');
		if (urlQuery && !$state.hasSearched && !$state.loading) {
			localQuery = urlQuery;
			lastSearchedQuery = urlQuery;
			movieSearch.search(urlQuery);
		} else if ($state.query) {
			localQuery = $state.query;
			lastSearchedQuery = $state.query;
		}
	});

	$: if ($state.hasSearched && !$state.loading && $state.query !== lastSearchedQuery) {
		lastSearchedQuery = $state.query;
		localQuery = $state.query;
	}

	$: heroFillView = !$state.hasSearched || ($state.loading && $state.results.length === 0);
</script>

<svelte:head>
	<title>BakaWorld χ - Movies &amp; TV</title>
	<meta name="description" content="Search movies and TV series on BakaWorld χ" />
</svelte:head>

<div class="movies-search-container">
	{#if isNavigatingToMovie}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-95">
			<div class="text-center">
				<div
					class="mb-4 inline-block h-16 w-16 animate-spin rounded-full border-4 border-gray-600 border-t-amber-500"
				></div>
				<p class="text-lg font-medium text-white">Loading…</p>
				<p class="mt-2 text-sm text-gray-400">Please wait</p>
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
					<h1 class="mb-4 text-4xl font-extrabold text-white drop-shadow-lg md:text-5xl">
						<span class="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
							Movies &amp; TV
						</span>
					</h1>
					<p class="text-lg text-gray-400">Search films and series</p>
				</div>

				<MovieSearchForm bind:query={localQuery} loading={$state.loading} on:search={handleSearch} />
			</div>
		</section>

		{#if !heroFillView}
			<section class="container mx-auto w-full max-w-7xl shrink-0 px-4 pb-10 pt-4 md:pt-6">
				{#if $state.results.length > 0 && !$state.loading}
					<div class="mb-6 text-center text-gray-400">
						<span class="font-semibold text-white">{$state.results.length}</span> results found
						{#if $state.query}
							for "<span class="text-amber-400">{$state.query}</span>"
						{/if}
						<span class="mx-2">•</span>
						Page <span class="font-semibold text-white">{$state.currentPage}</span> of
						<span class="font-semibold text-white">{$state.totalPages}</span>
					</div>
				{/if}

				<MovieGrid
					results={$state.results}
					loading={$state.loading}
					error={$state.error}
					query={$state.query}
					hasSearched={$state.hasSearched}
					searchQuery={$state.query}
				/>

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
		{/if}
	</main>
</div>
