<script lang="ts">
	import type { ConsumetMovie } from '$lib/types/movie';
	import { movieDetailPath } from '$lib/utils/moviePaths';

	export let movie: ConsumetMovie;
	/** When set, detail page can link back to search results */
	export let searchQuery: string = '';

	$: referer = (() => {
		try {
			return movie.url ? new URL(movie.url).origin + '/' : 'https://flixhq.to/';
		} catch {
			return 'https://flixhq.to/';
		}
	})();

	$: poster = movie.image || movie.cover || '';

	$: imageSrc = poster
		? `/api/proxy/image?url=${encodeURIComponent(poster)}&referer=${encodeURIComponent(referer)}`
		: '';

	$: detailHref =
		movieDetailPath(movie.id) + (searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : '');
</script>

<a
	href={detailHref}
	class="movie-card group flex h-full min-h-0 w-full max-w-[300px] flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-xl"
>
	<div class="relative aspect-[2/3] w-full shrink-0 overflow-hidden bg-gray-800">
		{#if imageSrc}
			<img
				src={imageSrc}
				alt={movie.title}
				class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
				loading="lazy"
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center text-sm text-gray-500">No poster</div>
		{/if}
	</div>
	<div class="flex flex-1 flex-col gap-1 p-3">
		<h3 class="line-clamp-2 text-sm font-semibold text-white group-hover:text-amber-200">{movie.title}</h3>
		<div class="mt-auto flex flex-wrap gap-1.5 text-xs text-gray-400">
			{#if movie.type}
				<span class="rounded bg-gray-800 px-2 py-0.5 text-gray-300">{movie.type}</span>
			{/if}
			{#if movie.releaseDate}
				<span class="rounded bg-gray-800 px-2 py-0.5">{movie.releaseDate}</span>
			{/if}
		</div>
		<span class="text-xs text-amber-500/90">View on BakaWorld →</span>
	</div>
</a>

<style>
	.movie-card {
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}
	.movie-card:hover {
		border-color: rgb(245 158 11 / 0.45);
		box-shadow: 0 12px 40px -12px rgb(0 0 0 / 0.5);
	}
</style>
