<!-- Individual Anime Card Component -->
<script lang="ts">
	import type { Anime } from '$lib/types/anime';

	export let anime: Anime;
</script>

<div class="anime-card bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-800 flex flex-col group" style="width: 300px;">
	<!-- Image Container (300x400 aspect ratio) -->
	<div class="relative w-full h-96" style="height: 400px;">
		<img 
			src={anime.image} 
			alt={anime.title} 
			class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
			loading="lazy"
			style="width: 300px; height: 400px; object-fit: cover;"
		/>
		{#if anime.nsfw}
			<span class="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
				NSFW
			</span>
		{/if}
		<!-- Overlay on hover -->
		<div class="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
	</div>
	
	<!-- Content -->
	<div class="p-4 flex-1 flex flex-col">
		<h2 class="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-300 transition-colors">
			{anime.title}
		</h2>
		
		{#if anime.japaneseTitle && anime.japaneseTitle !== anime.title}
			<p class="text-gray-400 text-sm mb-3 italic line-clamp-1">
				{anime.japaneseTitle}
			</p>
		{/if}
		
		<!-- Metadata Tags -->
		<div class="flex flex-wrap gap-2 mb-4">
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
		
		<!-- Language Info -->
		{#if anime.sub > 0 || anime.dub > 0}
			<div class="flex gap-2 mb-4">
				{#if anime.sub > 0}
					<span class="bg-purple-700 text-purple-100 text-xs px-2 py-1 rounded-full">
						Sub: {anime.sub}
					</span>
				{/if}
				{#if anime.dub > 0}
					<span class="bg-yellow-700 text-yellow-100 text-xs px-2 py-1 rounded-full">
						Dub: {anime.dub}
					</span>
				{/if}
			</div>
		{/if}
		
		<!-- Action Button -->
		<a 
			href="/anime/{anime.id}" 
			class="mt-auto inline-block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
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
