<!-- Anime Search Results Grid Component -->
<script lang="ts">
	import AnimeCard from './AnimeCard.svelte';
	import type { Anime } from '$lib/types/anime';

	export let results: Anime[];
	export let loading: boolean;
	export let error: string;
	export let query: string;
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
{:else if results.length === 0 && query}
	<!-- No Results Message -->
	<div class="text-center py-12">
		<div class="text-6xl mb-4">😔</div>
		<div class="text-gray-400 text-lg mb-2">No anime found</div>
		<div class="text-gray-500">Try a different search term for "{query}"</div>
	</div>
{:else if results.length > 0}
	<!-- Search Results Grid -->
	<div class="flex flex-wrap justify-center gap-6">
		{#each results as anime (anime.id)}
			<AnimeCard {anime} />
		{/each}
	</div>
{/if}
