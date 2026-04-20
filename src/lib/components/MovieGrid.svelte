<script lang="ts">
	import MovieCard from './MovieCard.svelte';
	import type { ConsumetMovie } from '$lib/types/movie';

	export let results: ConsumetMovie[];
	export let loading: boolean;
	export let error: string;
	export let query: string;
	export let hasSearched: boolean = false;
	export let searchQuery: string = '';
</script>

{#if error}
	<div class="mb-6 rounded-lg border border-red-700 bg-red-900/50 px-4 py-3 text-center text-red-200">
		<div class="font-semibold">Search error</div>
		<div class="mt-1 text-sm">{error}</div>
	</div>
{/if}

{#if loading}
	<div class="py-12 text-center">
		<div
			class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"
		></div>
		<div class="text-gray-400">Searching…</div>
	</div>
{:else if results.length === 0 && hasSearched && !loading}
	<div class="py-12 text-center">
		<div class="mb-4 text-6xl">🎬</div>
		<div class="mb-2 text-lg text-gray-400">Nothing turned up</div>
		<div class="text-gray-500">Try another title for “{query}”</div>
	</div>
{:else if results.length > 0}
	<div
		class="grid grid-cols-1 items-stretch justify-items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5"
	>
		{#each results as movie (movie.id)}
			<div class="mx-auto flex h-full w-full max-w-[300px] min-h-0">
				<MovieCard {movie} {searchQuery} />
			</div>
		{/each}
	</div>
{/if}
