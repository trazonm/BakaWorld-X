<script lang="ts">
	import MovieCard from './MovieCard.svelte';
	import type { ConsumetMovie } from '$lib/types/movie';

	export let title: string;
	export let items: ConsumetMovie[];
	export let searchQuery: string = '';
</script>

{#if items.length > 0}
	<section class="mb-10 text-left" aria-label={title}>
		<h2 class="mb-4 text-xl font-bold tracking-tight text-white">{title}</h2>
		<div class="flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
			{#each items as movie (movie.id)}
				<div class="w-[150px] shrink-0 snap-start sm:w-[190px]">
					<MovieCard movie={{ ...movie, image: movie.image || movie.cover || '' }} {searchQuery} />
				</div>
			{/each}
		</div>
	</section>
{/if}
