<!-- Individual Manga Card Component -->
<script lang="ts">
	import type { ConsumetManga } from '$lib/types/manga';
	import { dev } from '$app/environment';

	export let manga: ConsumetManga;
	export let searchQuery: string = '';
	
	$: mangaUrl = searchQuery 
		? `/manga/${manga.id}?query=${encodeURIComponent(searchQuery)}`
		: `/manga/${manga.id}`;
	
	// Format release date - extract year only for consistent sizing
	$: releaseYear = manga.releaseDate 
		? (typeof manga.releaseDate === 'number' 
			? String(manga.releaseDate) 
			: String(manga.releaseDate).substring(0, 4))
		: '';
	
	// Use proxy only in production (to handle CORS), direct URL in dev
	$: imageSrc = manga.image 
		? (dev 
			? manga.image 
			: `/api/proxy/image?url=${encodeURIComponent(manga.image)}&referer=https://mangadex.org/`)
		: '';
</script>

<div class="manga-card bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-800 flex flex-col group h-full w-full">
	<!-- Image Container (fixed height) -->
	<div class="relative w-full flex-shrink-0 aspect-[3/4]">
		{#if imageSrc}
			<img 
				src={imageSrc}
				alt={manga.title} 
				class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
				on:error={(e) => {
					// Fallback to a placeholder if image fails to load
					const img = e.currentTarget as HTMLImageElement;
					img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23374151" width="300" height="400"/%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
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
			{manga.title}
		</h2>
		
		<!-- Metadata Tags (flex grow to push button down) -->
		<div class="flex flex-wrap gap-2 mb-4 flex-grow items-start">
			{#if manga.status}
				<span class="bg-blue-700 text-blue-100 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap inline-block">
					{manga.status}
				</span>
			{/if}
			{#if manga.contentRating}
				<span class="bg-purple-700 text-purple-100 text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block">
					{manga.contentRating}
				</span>
			{/if}
			{#if releaseYear}
				<span class="bg-gray-700 text-gray-200 text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block">
					{releaseYear}
				</span>
			{/if}
			{#if manga.lastVolume}
				<span class="bg-green-700 text-green-100 text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block">
					Vol {manga.lastVolume}
				</span>
			{/if}
			{#if manga.lastChapter}
				<span class="bg-orange-700 text-orange-100 text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block">
					Ch {manga.lastChapter}
				</span>
			{/if}
			{#if (manga as any).rating}
				<span class="bg-yellow-700 text-yellow-100 text-xs px-2.5 py-1 rounded-full whitespace-nowrap inline-block">
					⭐ {(manga as any).rating}
				</span>
			{/if}
		</div>
		
		<!-- Action Button (always at bottom) -->
		<a 
			href={mangaUrl}
			class="mt-auto inline-block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex-shrink-0 touch-manipulation min-h-[44px]"
		>
			Read Now
		</a>
	</div>
</div>

<style>
	.manga-card {
		transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
	}
	
	.manga-card:hover {
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

