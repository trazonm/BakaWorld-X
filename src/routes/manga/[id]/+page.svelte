<script lang="ts">
	import type { PageData } from './$types';
	
	export let data: PageData;
	$: manga = data.manga;
	$: searchQuery = data.searchQuery || '';
	
	// Compute manga title (handle null title and use altTitles)
	$: mangaTitle = manga.title || (manga.altTitles && manga.altTitles.length > 0 && manga.altTitles[0] 
		? (manga.altTitles[0].en || Object.values(manga.altTitles[0])[0]) 
		: 'Untitled Manga');
	
	// Compute description (handle object with language keys)
	$: mangaDescription = typeof manga.description === 'string' 
		? manga.description 
		: (manga.description && typeof manga.description === 'object'
			? (manga.description.en || manga.description['en'] || Object.values(manga.description)[0] || '')
			: '');
	
	// Back to results URL
	$: backToResultsUrl = searchQuery ? `/manga?query=${encodeURIComponent(searchQuery)}` : '/manga';
</script>

<svelte:head>
	<title>{mangaTitle} - BakaWorld X</title>
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
</style>

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
				<img 
					src={manga.image} 
					alt={manga.title}
					class="w-80 h-96 object-cover rounded-lg shadow-2xl"
					style="width: 300px; height: 400px; object-fit: cover;"
				/>
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
					{#if manga.rating}
						<span class="bg-yellow-700 text-yellow-100 text-sm px-3 py-1 rounded-full">
							⭐ {manga.rating}
						</span>
					{/if}
					{#if manga.releaseDate}
						<span class="bg-gray-700 text-gray-200 text-sm px-3 py-1 rounded-full">
							{manga.releaseDate}
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
						<a 
							href="/manga/{manga.id}/read/{chapter.id}"
							class="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:bg-gray-800 hover:border-blue-500 transition-all cursor-pointer"
						>
							<h3 class="text-white font-semibold mb-1">
								Chapter {chapter.chapterNumber || chapter.number || 'N/A'}
							</h3>
							{#if chapter.title}
								<p class="text-gray-400 text-sm line-clamp-2">{chapter.title}</p>
							{/if}
							{#if chapter.releaseDate}
								<p class="text-gray-500 text-xs mt-2">{chapter.releaseDate}</p>
							{/if}
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

