<!-- Manga Grid Component -->
<script lang="ts">
	import type { Manga } from '$lib/types/manga';
	import MangaCard from './MangaCard.svelte';

	export let results: Manga[] = [];
	export let loading: boolean = false;
	export let error: string = '';
	export let query: string = '';
	export let hasSearched: boolean = false;
</script>

{#if error}
	<div class="text-center py-12">
		{#if error === 'MANGA_API_DOWN' || error.includes('MANGA_API_DOWN')}
			<div class="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-2 border-purple-500/50 rounded-xl p-8 max-w-2xl mx-auto backdrop-blur-sm">
				<div class="mb-6 flex justify-center">
					<img 
						src="/killua_error.png" 
						alt="Killua error" 
						class="max-w-xs w-full h-auto drop-shadow-2xl"
					/>
				</div>
				<h3 class="text-2xl font-bold text-white mb-3">Mangas are taking a nap!</h3>
				<p class="text-purple-200 text-lg mb-6 leading-relaxed">
					Looks like the manga servers decided to hit the snooze button! While BakaBoi341 is working their magic to wake them up, why not explore something else?
				</p>
				<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
					<a 
						href="/anime" 
						class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg"
					>
						🎬 Watch Some Anime
					</a>
					<a 
						href="/comics" 
						class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg"
					>
						📚 Read Some Comics
					</a>
				</div>
				<p class="text-purple-300 text-sm mt-6 italic">
					Don't worry, BakaBoi341 is on it! 🔧
				</p>
			</div>
		{:else}
			<div class="bg-red-900/50 border border-red-700 rounded-lg p-6 max-w-md mx-auto">
				<p class="text-red-300 font-semibold mb-2">Error loading manga</p>
				<p class="text-red-400 text-sm">{error}</p>
			</div>
		{/if}
	</div>
{:else if loading}
	<div class="flex justify-center items-center py-20">
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
			<p class="text-gray-400">Searching for manga...</p>
		</div>
	</div>
{:else if results.length === 0 && hasSearched && !loading}
	<div class="text-center py-12">
		<p class="text-gray-400 text-lg">No manga found for "<span class="text-white font-semibold">{query}</span>"</p>
		<p class="text-gray-500 text-sm mt-2">Try a different search term</p>
	</div>
{:else if results.length > 0}
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
		{#each results as manga (manga.id)}
			<div class="w-full max-w-[300px]">
				<MangaCard {manga} searchQuery={query} />
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center py-12">
		<p class="text-gray-400 text-lg">Start searching to discover manga</p>
	</div>
{/if}

