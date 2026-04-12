<!-- Individual Anime Card Component -->
<script lang="ts">
	import type { Anime } from '$lib/types/anime';

	export let anime: Anime;
</script>

<div
	class="anime-card group flex h-full min-h-0 w-full max-w-[300px] flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-xl"
>
	<!-- Image Container (fixed height so every card poster aligns) -->
	<div class="relative h-[400px] w-full shrink-0">
		<img
			src={anime.image}
			alt={anime.title}
			class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
			loading="lazy"
		/>
		{#if anime.nsfw}
			<span class="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
				NSFW
			</span>
		{/if}
		<!-- Overlay on hover -->
		<div class="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
	</div>
	
	<!-- Content: flex-1 fills row so mt-auto pins the button across cards -->
	<div class="flex min-h-0 flex-1 flex-col p-4">
		<h2
			class="mb-2 line-clamp-2 min-h-[3.5rem] text-lg font-bold text-white transition-colors group-hover:text-blue-300"
		>
			{anime.title}
		</h2>

		<div class="mb-3 min-h-[1.375rem] text-sm italic text-gray-400">
			{#if anime.japaneseTitle && anime.japaneseTitle !== anime.title}
				<p class="line-clamp-1">{anime.japaneseTitle}</p>
			{/if}
		</div>

		<!-- Metadata Tags -->
		<div class="mb-4 flex min-h-[2.75rem] flex-wrap content-start gap-2">
			{#if anime.type}
				<span class="bg-blue-700 text-blue-100 text-xs px-2 py-1 rounded-full font-medium">
					{anime.type}
				</span>
			{/if}
			{#if anime.duration}
				<span class="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded-full">
					{anime.duration}
				</span>
			{/if}
			{#if anime.episodes}
				<span class="bg-green-700 text-green-100 text-xs px-2 py-1 rounded-full">
					{anime.episodes} ep
				</span>
			{/if}
		</div>
		
		<!-- Language Info (fixed min height so rows align when dub is missing) -->
		<div class="mb-4 flex min-h-[2rem] flex-wrap gap-2">
			{#if anime.sub > 0}
				<span class="rounded-full bg-purple-700 px-2 py-1 text-xs text-purple-100">
					Sub: {anime.sub}
				</span>
			{/if}
			{#if anime.dub > 0}
				<span class="rounded-full bg-yellow-700 px-2 py-1 text-xs text-yellow-100">
					Dub: {anime.dub}
				</span>
			{/if}
		</div>

		<!-- Action Button -->
		<a
			href="/anime/{anime.id}"
			class="mt-auto inline-block min-h-[44px] w-full touch-manipulation rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-blue-700 hover:shadow-lg"
		>
			Watch Now
		</a>
	</div>
</div>

<style>
	.anime-card {
		transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
	}
	
	.anime-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.1);
	}

	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
