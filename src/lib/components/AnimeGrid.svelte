<!-- Anime Search Results Grid Component -->
<script lang="ts">
	import AnimeCard from './AnimeCard.svelte';
	import type { Anime } from '$lib/types/anime';

	export let results: Anime[];
	export let loading: boolean;
	export let error: string;
	export let query: string;
	export let hasSearched: boolean = false;
</script>

<!-- Error Message -->
{#if error}
	<div class="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6 text-center">
		<div class="font-semibold">Search Error</div>
		<div class="text-sm mt-1">{error}</div>
	</div>
{/if}

<!-- Loading State -->
{#if loading}
	<div class="text-center py-12">
		<div class="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
		<div class="text-gray-400">Searching for anime...</div>
	</div>
{:else if results.length === 0 && hasSearched && !loading}
	<!-- No Results Message -->
	<div class="text-center py-12">
		<div class="text-6xl mb-4">😔</div>
		<div class="text-gray-400 text-lg mb-2">No anime found</div>
		<div class="text-gray-500">Try a different search term for "{query}"</div>
	</div>
{:else if results.length > 0}
	<!-- Search Results Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 justify-items-center">
		{#each results as anime (anime.id)}
			<div class="w-full max-w-[300px]">
				<AnimeCard {anime} />
			</div>
		{/each}
	</div>
{/if}
