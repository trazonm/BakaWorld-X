<script lang="ts">
	import type { PageData } from './$types';
	
	export let data: PageData;
	$: anime = data.anime;
	$: {
		anime.episodes.forEach((episode:any) => {
			episode.id = episode.id.replace(/\$/g, '-');
		});
	}
</script>

<svelte:head>
	<title>{anime.title} - BakaWorld X</title>
	<meta name="description" content={anime.description || `Watch ${anime.title} online`} />
</svelte:head>

<style>
	/* Override global overflow for this page only */
	:global(html), :global(body) {
		overflow-y: auto !important;
		height: auto !important;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

<div class="anime-detail-container">
	<main class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Header Section -->
		<div class="flex flex-col lg:flex-row gap-8 mb-8">
			<!-- Anime Poster -->
			<div class="flex-shrink-0">
				<img 
					src={anime.image} 
					alt={anime.title}
					class="w-80 h-96 object-cover rounded-lg shadow-2xl"
					style="width: 300px; height: 400px; object-fit: cover;"
				/>
				{#if anime.nsfw}
					<div class="mt-2 inline-block bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full">
						NSFW
					</div>
				{/if}
			</div>

			<!-- Anime Info -->
			<div class="flex-1">
				<h1 class="text-4xl font-bold text-white mb-2">{anime.title}</h1>
				
				{#if anime.japaneseTitle && anime.japaneseTitle !== anime.title}
					<p class="text-xl text-gray-400 mb-4 italic">{anime.japaneseTitle}</p>
				{/if}

				<!-- Metadata -->
				<div class="flex flex-wrap gap-3 mb-6">
					{#if anime.type}
						<span class="bg-blue-700 text-blue-100 px-3 py-1 rounded-full font-medium">
							{anime.type}
						</span>
					{/if}
					{#if anime.status}
						<span class="bg-green-700 text-green-100 px-3 py-1 rounded-full">
							{anime.status}
						</span>
					{/if}
					{#if anime.season}
						<span class="bg-purple-700 text-purple-100 px-3 py-1 rounded-full">
							{anime.season}
						</span>
					{/if}
					{#if anime.totalEpisodes}
						<span class="bg-orange-700 text-orange-100 px-3 py-1 rounded-full">
							{anime.totalEpisodes} Episodes
						</span>
					{/if}
				</div>

				<!-- Language Info -->
				<div class="flex gap-3 mb-6">
					{#if anime.hasSub}
						<span class="bg-purple-600 text-white px-3 py-1 rounded-full">
							Subtitled
						</span>
					{/if}
					{#if anime.hasDub}
						<span class="bg-yellow-600 text-white px-3 py-1 rounded-full">
							Dubbed
						</span>
					{/if}
				</div>

				<!-- Genres -->
				{#if anime.genres && anime.genres.length > 0}
					<div class="mb-6">
						<h3 class="text-lg font-semibold text-white mb-2">Genres</h3>
						<div class="flex flex-wrap gap-2">
							{#each anime.genres as genre}
								<span class="bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm">
									{genre}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Description -->
				{#if anime.description}
					<div class="mb-6">
						<h3 class="text-lg font-semibold text-white mb-2">Synopsis</h3>
						<p class="text-gray-300 leading-relaxed">{anime.description}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Episodes Section -->
		{#if anime.episodes && anime.episodes.length > 0}
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-white mb-6">Episodes</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{#each anime.episodes as episode}
						<a
							href="/anime/{anime.id}/watch/{episode.id.replace(/\$/g, '-')}"
							class="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors border border-gray-700 hover:border-blue-500"
						>
							<div class="flex items-center justify-between mb-2">
								<span class="text-blue-400 font-semibold">Episode {episode.number}</span>
								<div class="flex gap-1">
									{#if episode.isSubbed}
										<span class="bg-purple-600 text-white text-xs px-2 py-1 rounded">SUB</span>
									{/if}
									{#if episode.isDubbed}
										<span class="bg-yellow-600 text-white text-xs px-2 py-1 rounded">DUB</span>
									{/if}
									{#if episode.isFiller}
										<span class="bg-red-600 text-white text-xs px-2 py-1 rounded">FILLER</span>
									{/if}
								</div>
							</div>
							<h4 class="text-white font-medium text-sm line-clamp-2">{episode.title}</h4>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Related Anime -->
		{#if anime.relatedAnime && anime.relatedAnime.length > 0}
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-white mb-6">Related Anime</h2>
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
					{#each anime.relatedAnime as related}
						<a
							href="/anime/{related.id}"
							class="group block bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors"
						>
							<img 
								src={related.image} 
								alt={related.title}
								class="w-full h-48 object-cover group-hover:scale-105 transition-transform"
							/>
							<div class="p-3">
								<h4 class="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-300 transition-colors">
									{related.title}
								</h4>
								<p class="text-gray-400 text-xs mt-1">{related.type}</p>
								{#if related.episodes}
									<p class="text-gray-500 text-xs">{related.episodes} episodes</p>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Back Button -->
		<div class="mt-8">
			<a 
				href="/anime" 
				class="inline-flex items-center bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
				Back to Search
			</a>
		</div>
	</main>
</div>
