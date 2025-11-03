<!-- Individual Comic Card Component -->
<script lang="ts">
	import type { Comic } from '$lib/types/comic';

	export let comic: Comic;
	export let searchQuery: string = '';
	
	$: comicUrl = searchQuery 
		? `/comics/${comic.id}?query=${encodeURIComponent(searchQuery)}`
		: `/comics/${comic.id}`;
	
	// Format start year
	$: startYear = comic.startYear || '';
</script>

<div class="comic-card bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-800 flex flex-col group h-full w-full">
	<!-- Image Container (fixed height) -->
	<div class="relative w-full flex-shrink-0 aspect-[3/4]">
		{#if comic.image}
			<img 
				src={`/api/proxy/image?url=${encodeURIComponent(comic.image)}&referer=https://readcomicsonline.ru/`}
				alt={comic.title} 
				class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
				on:error={(e) => {
					// Fallback to a placeholder if image fails to load
					e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23374151" width="300" height="400"/%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
				}}
			/>
		{:else}
			<div class="w-full h-full bg-gray-800 flex items-center justify-center">
				<p class="text-gray-500 text-sm">No Image</p>
			</div>
		{/if}
		<!-- Overlay on hover -->
		<div class="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
	</div>
	
	<!-- Content (flex column with min-height for consistent button placement) -->
	<div class="p-4 flex-1 flex flex-col min-h-[140px]">
		<!-- Title (fixed height to prevent shifting) -->
		<h2 class="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-blue-300 transition-colors min-h-[3rem]">
			{comic.title}
		</h2>
		
		<!-- Metadata Tags (flex grow to push button down) -->
		<div class="flex flex-wrap gap-2 mb-4 flex-grow items-start">
			{#if comic.publisher}
				<span class="bg-blue-700 text-blue-100 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap inline-block">
					{comic.publisher}
				</span>
			{/if}
			{#if startYear}
				<span class="bg-gray-700 text-gray-200 text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block">
					{startYear}
				</span>
			{/if}
			{#if comic.issueCount}
				<span class="bg-green-700 text-green-100 text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block">
					{comic.issueCount} Issues
				</span>
			{/if}
		</div>
		
		<!-- Action Button (always at bottom) -->
		<a 
			href={comicUrl}
			class="mt-auto inline-block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex-shrink-0 touch-manipulation min-h-[44px]"
		>
			View Series
		</a>
	</div>
</div>

<style>
	.comic-card {
		transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
	}
	
	.comic-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.1);
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

