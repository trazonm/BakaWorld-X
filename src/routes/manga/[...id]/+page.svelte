<script lang="ts">
	import type { PageData } from './$types';
	import { navigating } from '$app/stores';
	
	export let data: PageData;
	$: manga = data.manga;
	$: searchQuery = data.searchQuery || '';
	
	// Compute manga title (handle alternative titles)
	$: mangaTitle = manga.title || 'Untitled Manga';
	
	// Compute description (Mangapill API uses 'description' field)
	$: mangaDescription = manga.description || '';
	
	// Back to results URL
	$: backToResultsUrl = searchQuery ? `/manga?query=${encodeURIComponent(searchQuery)}` : '/manga';
	
	// Use our own proxy with proper referer for Mangapill CDN
	$: imageSrc = manga.image 
		? `/api/proxy/image?url=${encodeURIComponent(manga.image)}&referer=https://mangapill.com/`
		: '';
	
	// Track navigation loading state
	$: isNavigating = !!$navigating;
</script>

<svelte:head>
	<title>{mangaTitle} - BakaWorld χ</title>
	<meta name="description" content={mangaDescription || `Read ${mangaTitle} online`} />
</svelte:head>

<style>
	/* Override global overflow for this page only */
	:global(html), :global(body) {
		overflow-y: auto !important;
		height: auto !important;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		backdrop-filter: blur(4px);
	}

	.spinner {
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		border-top: 4px solid #3b82f6;
		width: 64px;
		height: 64px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.loading-text {
		color: white;
		font-size: 1.125rem;
		font-weight: 600;
	}
</style>

<!-- Loading Overlay -->
{#if isNavigating}
	<div class="loading-overlay">
		<div class="spinner"></div>
		<p class="loading-text">Loading manga...</p>
	</div>
{/if}

<div class="manga-detail-container">
	<main class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Back to Results Button -->
		{#if searchQuery}
			<div class="mb-6">
				<a 
					href={backToResultsUrl}
					class="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to Results
				</a>
			</div>
		{/if}

		<!-- Header Section -->
		<div class="flex flex-col lg:flex-row gap-8 mb-8">
			<!-- Manga Cover -->
			<div class="flex-shrink-0">
				{#if imageSrc}
					<img 
						src={imageSrc}
						alt={mangaTitle}
						class="w-80 h-96 object-cover rounded-lg shadow-2xl"
						style="width: 300px; height: 400px; object-fit: cover;"
						crossorigin="anonymous"
						referrerpolicy="no-referrer"
						on:error={(e) => {
							// Fallback to a placeholder if image fails to load
							const img = e.currentTarget as HTMLImageElement;
							// Prevent infinite loop if placeholder also fails
							if (!img.src.startsWith('data:')) {
								img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23374151" width="300" height="400"/%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
							}
						}}
					/>
				{:else}
					<div class="w-80 h-96 bg-gray-800 flex items-center justify-center rounded-lg shadow-2xl" style="width: 300px; height: 400px;">
						<p class="text-gray-500">No Image</p>
					</div>
				{/if}
			</div>

			<!-- Manga Info -->
			<div class="flex-1">
				<h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">
					{mangaTitle}
				</h1>
				
				{#if mangaDescription}
					<p class="text-gray-300 mb-6 line-clamp-3">{mangaDescription}</p>
				{/if}

				<!-- Metadata -->
				<div class="flex flex-wrap gap-3 mb-6">
					{#if manga.status}
						<span class="bg-blue-700 text-blue-100 text-sm px-3 py-1 rounded-full">
							{manga.status}
						</span>
					{/if}
					{#if manga.type}
						<span class="bg-purple-700 text-purple-100 text-sm px-3 py-1 rounded-full">
							{manga.type}
						</span>
					{/if}
					{#if manga.year}
						<span class="bg-gray-700 text-gray-200 text-sm px-3 py-1 rounded-full">
							{manga.year}
						</span>
					{/if}
				</div>

				<!-- Genres -->
				{#if manga.genres && manga.genres.length > 0}
					<div class="mb-6">
						<h3 class="text-white font-semibold mb-2">Genres:</h3>
						<div class="flex flex-wrap gap-2">
							{#each manga.genres as genre}
								<span class="bg-purple-700 text-purple-100 text-xs px-2 py-1 rounded-full">
									{genre}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Authors -->
				{#if manga.authors && manga.authors.length > 0}
					<div class="mb-6">
						<h3 class="text-white font-semibold mb-2">Authors:</h3>
						<p class="text-gray-300">{manga.authors.join(', ')}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Chapters List -->
		{#if manga.chapters && manga.chapters.length > 0}
			<div class="mt-8">
				<h2 class="text-2xl font-bold text-white mb-4">Chapters</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{#each manga.chapters as chapter}
						{@const cleanChapterId = chapter.id.startsWith('chapters/') ? chapter.id.substring(9) : chapter.id}
						{@const cleanMangaId = manga.id.startsWith('manga/') ? manga.id.substring(6) : manga.id}
						<a 
							href="/manga/{cleanMangaId}/read/{cleanChapterId}"
							class="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:bg-gray-800 hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between group"
						>
							<h3 class="text-white font-semibold">
								{chapter.title || 'Chapter N/A'}
							</h3>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</a>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="max-w-md mx-auto">
					<p class="text-gray-400 text-lg mb-2">No chapters available</p>
					<p class="text-gray-500 text-sm">
						This manga may not have chapters loaded yet, or the API may need to be updated.
					</p>
				</div>
			</div>
		{/if}
	</main>
</div>

