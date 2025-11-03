<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let {
		anime,
		episode,
		videoData,
		nextEpisode,
		prevEpisode,
		animeId,
		episodeId
	} = data;
	$: ({
		anime,
		episode,
		videoData,
		nextEpisode,
		prevEpisode,
		animeId,
		episodeId
	} = data);

	let selectedLanguage = 'sub';
	let loading = false;
	let error = '';
	let playerActivated = false; // Track if player has been activated on mobile
	let isClient = false; // Track if we're on client side

	// Language options for MegaPlay
	const languages = [
		{ name: 'sub', label: 'Subbed' },
		{ name: 'dub', label: 'Dubbed' }
	];

	// Get the embed URL from videoData
	$: embedUrl = videoData?.embedUrl || videoData?.sources?.[0]?.url;
	$: loading = !embedUrl;

	// Activate player on mobile (removes overlay)
	function activatePlayer() {
		playerActivated = true;
	}

	// Reset activation when language or episode changes
	$: if (embedUrl && (selectedLanguage || episodeId)) {
		// Only reset on mobile, desktop is always active
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			playerActivated = false;
		} else {
			playerActivated = true; // Desktop is always activated
		}
	}

	// Check if we're on client and set initial activation state
	onMount(() => {
		isClient = true;
		// Desktop is always activated, mobile starts deactivated
		if (window.innerWidth >= 768) {
			playerActivated = true;
		}
	});


	function navigateToEpisode(episode: any) {
		if (!episode) return;
		const episodeId = episode.id.replace(/\$/g, '-');
		goto(`/anime/${animeId}/watch/${episodeId}?language=${selectedLanguage}`);
	}

	function goToNextEpisode() {
		navigateToEpisode(nextEpisode);
	}

	function goToPrevEpisode() {
		navigateToEpisode(prevEpisode);
	}

	function changeLanguage(newLanguage: string) {
		selectedLanguage = newLanguage;
		goto(`/anime/${animeId}/watch/${episodeId}?language=${newLanguage}`);
	}
</script>

<svelte:head>
	<title>{episode.title} - {anime.title} - BakaWorld X</title>
	<meta name="description" content="Watch {episode.title} from {anime.title}" />
</svelte:head>

<div class="theme-bg-primary">
	<!-- Video Player -->
	<div class="relative w-full" style="padding-top: 56.25%;">
		{#if embedUrl}
			<iframe
				src={embedUrl}
				class="absolute top-0 left-0 w-full h-full"
				frameborder="0"
				scrolling="no"
				allowfullscreen
				title="Video Player"
				referrerpolicy="no-referrer"
				style={playerActivated || !isClient ? 'pointer-events: auto;' : 'pointer-events: none;'}
			></iframe>
			<!-- Mobile overlay to prevent accidental clicks -->
			{#if !playerActivated}
				<div 
					class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] md:hidden z-10"
					onclick={activatePlayer}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							activatePlayer();
						}
					}}
				>
					<div class="text-center p-6 bg-black/60 rounded-lg border border-gray-600">
						<p class="text-white font-semibold mb-2">Tap to activate video player</p>
						<p class="text-gray-300 text-sm">This prevents accidental popups</p>
					</div>
				</div>
			{/if}
		{:else}
			<div class="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900">
				<div class="max-w-lg text-center p-8">
					<div class="mb-4 text-xl text-red-400">
						Unable to load video
					</div>
					<p class="text-gray-400 mb-4">
						The video source could not be loaded. Please try again later.
					</p>
					<button
						class="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
						on:click={() => window.location.reload()}
					>
						Reload Page
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Controls -->
	<div class="container mx-auto max-w-6xl px-4 py-6">
		<!-- Episode Info -->
		<div class="mb-6">
			<h1 class="mb-2 text-2xl font-bold text-white">
				{anime.title} - Episode {episode.number}
			</h1>
			<h2 class="text-lg text-gray-400">{episode.title}</h2>
		</div>

		<!-- Language Selection -->
		<div class="mb-6 flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label for="language-select" class="text-sm font-medium text-white">Language:</label>
				<select
					id="language-select"
					bind:value={selectedLanguage}
					on:change={(e) => changeLanguage(e.currentTarget.value)}
					class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					{#each languages as langOption}
						<option value={langOption.name}>{langOption.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Navigation -->
		<div class="mb-8 flex items-center gap-4">
			<button
				on:click={goToPrevEpisode}
				disabled={!prevEpisode}
				class="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
			>
				← Previous
			</button>

			<button
				on:click={goToNextEpisode}
				disabled={!nextEpisode}
				class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500"
			>
				Next →
			</button>

			<a
				href="/anime/{animeId}"
				class="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
			>
				← Back to Episodes
			</a>
		</div>
	</div>
</div>
