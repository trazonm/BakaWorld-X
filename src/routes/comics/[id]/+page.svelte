<script lang="ts">
	import type { PageData } from './$types';
	
	export let data: PageData;
	$: comic = data.comic;
	$: searchQuery = data.searchQuery || '';
	
	// Back to results URL
	$: backToResultsUrl = searchQuery ? `/comics?query=${encodeURIComponent(searchQuery)}` : '/comics';
</script>

<svelte:head>
	<title>{comic.title} - BakaWorld X</title>
	<meta name="description" content={comic.description || `View ${comic.title} comic series`} />
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

<div class="comic-detail-container min-h-screen">
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
			<!-- Comic Cover -->
			<div class="flex-shrink-0">
				{#if comic.image}
					<img 
						src={`/api/proxy/image?url=${encodeURIComponent(comic.image)}&referer=https://readcomicsonline.ru/`}
						alt={comic.title}
						class="w-80 h-96 object-cover rounded-lg shadow-2xl"
						style="width: 300px; height: 400px; object-fit: cover;"
						on:error={(e) => {
							e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23374151" width="300" height="400"/%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
						}}
					/>
				{:else}
					<div class="w-80 h-96 bg-gray-800 rounded-lg shadow-2xl flex items-center justify-center">
						<p class="text-gray-500">No Image</p>
					</div>
				{/if}
			</div>

			<!-- Comic Info -->
			<div class="flex-1">
				<h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">
					{comic.title}
				</h1>
				
				{#if comic.description}
					<p class="text-gray-300 mb-6 line-clamp-3">{comic.description}</p>
				{/if}

				<!-- Metadata -->
				<div class="flex flex-wrap gap-3 mb-6">
					{#if comic.publisher}
						<span class="bg-blue-700 text-blue-100 text-sm px-3 py-1 rounded-full">
							{comic.publisher}
						</span>
					{/if}
					{#if comic.startYear}
						<span class="bg-gray-700 text-gray-200 text-sm px-3 py-1 rounded-full">
							Started: {comic.startYear}
						</span>
					{/if}
					{#if comic.issueCount}
						<span class="bg-green-700 text-green-100 text-sm px-3 py-1 rounded-full">
							{comic.issueCount} Issues
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Issues List -->
		{#if comic.issues && comic.issues.length > 0}
			<div class="mt-8">
				<h2 class="text-2xl font-bold text-white mb-4">Issues</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{#each comic.issues as issue}
						<a 
							href="/comics/{comic.id}/read/{issue.id}"
							class="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:bg-gray-800 hover:border-blue-500 transition-all cursor-pointer"
						>
							<h3 class="text-white font-semibold mb-1">
								Issue #{issue.issueNumber}
								{#if issue.title}
									<span class="text-gray-400 text-sm block mt-1">{issue.title}</span>
								{/if}
							</h3>
							{#if issue.coverDate}
								<p class="text-gray-500 text-xs mt-2">{issue.coverDate}</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="max-w-md mx-auto">
					<p class="text-gray-400 text-lg mb-2">No issues available</p>
					<p class="text-gray-500 text-sm">
						This comic series may not have issues loaded yet, or the API may need to be updated.
					</p>
				</div>
			</div>
		{/if}
	</main>
</div>

