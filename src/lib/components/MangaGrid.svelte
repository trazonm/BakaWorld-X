<!-- Manga Grid Component -->
<script lang="ts">
	import type { Manga } from '$lib/types/manga';
	import MangaCard from './MangaCard.svelte';

	export let results: Manga[] = [];
	export let loading: boolean = false;
	export let error: string = '';
	export let query: string = '';
	export let hasSearched: boolean = false;
</script>

{#if error}
	<div class="text-center py-12">
		<div class="bg-red-900/50 border border-red-700 rounded-lg p-6 max-w-md mx-auto">
			<p class="text-red-300 font-semibold mb-2">Error loading manga</p>
			<p class="text-red-400 text-sm">{error}</p>
		</div>
	</div>
{:else if loading}
	<div class="flex justify-center items-center py-20">
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
			<p class="text-gray-400">Searching for manga...</p>
		</div>
	</div>
{:else if results.length === 0 && hasSearched && !loading}
	<div class="text-center py-12">
		<p class="text-gray-400 text-lg">No manga found for "<span class="text-white font-semibold">{query}</span>"</p>
		<p class="text-gray-500 text-sm mt-2">Try a different search term</p>
	</div>
{:else if results.length > 0}
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
		{#each results as manga (manga.id)}
			<div class="w-full max-w-[300px]">
				<MangaCard {manga} searchQuery={query} />
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center py-12">
		<p class="text-gray-400 text-lg">Start searching to discover manga</p>
	</div>
{/if}

