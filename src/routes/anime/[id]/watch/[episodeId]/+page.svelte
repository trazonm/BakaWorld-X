<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
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

	// Skip Filler toggle state
	const SKIP_FILLER_STORAGE_KEY = 'bakaworld-skip-filler';
	let skipFiller = false;

	// Language options for MegaPlay
	const languages = [
		{ name: 'sub', label: 'Subbed' },
		{ name: 'dub', label: 'Dubbed' }
	];

	// Get the embed URL from videoData
	$: embedUrl = videoData?.embedUrl || videoData?.sources?.[0]?.url;
	$: loading = !embedUrl;

	// Block popups from iframe
	let iframeElement: HTMLIFrameElement;
	
	function handleIframeLoad() {
		if (!iframeElement) return;
		
		// Try to access iframe content and block window.open
		try {
			// Block window.open from the parent window (though iframe can't access parent's window.open directly)
			// Instead, we'll monitor for new window creation
			const originalOpen = window.open;
			window.open = function(url?: string | URL, target?: string, features?: string) {
				// Block popups - don't open new windows
				console.log('Blocked popup attempt:', url);
				return null;
			};
			
			// Also monitor beforeunload which might trigger popups
			window.addEventListener('beforeunload', (e) => {
				// Allow normal navigation, but this won't prevent iframe popups
			});
		} catch (e) {
			// Cross-origin restriction - can't access iframe content
			console.log('Cannot access iframe content (cross-origin)');
		}
	}
	
	// Store original window.open to restore later
	let originalWindowOpen: typeof window.open;
	
	onMount(() => {
		// Save original window.open
		originalWindowOpen = window.open;
		
		// Override window.open to block popups
		window.open = function(url?: string | URL, target?: string, features?: string) {
			console.log('Blocked popup attempt to:', url);
			return null; // Return null to block the popup
		};

		// Load skip filler preference from localStorage
		if (browser) {
			const stored = localStorage.getItem(SKIP_FILLER_STORAGE_KEY);
			skipFiller = stored === 'true';
		}
	});
	
	onDestroy(() => {
		// Restore original window.open
		if (originalWindowOpen) {
			window.open = originalWindowOpen;
		}
	});

	function navigateToEpisode(episode: any) {
		if (!episode) return;
		const episodeId = episode.id.replace(/\$/g, '-');
		goto(`/anime/${animeId}/watch/${episodeId}?language=${selectedLanguage}`);
	}

	function findNextNonFillerEpisode(currentIndex: number, direction: 'next' | 'prev'): any {
		if (!anime?.episodes || currentIndex < 0) return null;
		
		const episodes = anime.episodes;
		const step = direction === 'next' ? 1 : -1;
		let index = currentIndex + step;
		
		while (index >= 0 && index < episodes.length) {
			const ep = episodes[index];
			if (!ep.isFiller) {
				return ep;
			}
			index += step;
		}
		
		return null;
	}

	function goToNextEpisode() {
		if (skipFiller && anime?.episodes) {
			const currentIndex = anime.episodes.findIndex((ep: any) => 
				ep.id.replace(/\$/g, '-') === episodeId
			);
			const nextNonFiller = findNextNonFillerEpisode(currentIndex, 'next');
			if (nextNonFiller) {
				navigateToEpisode(nextNonFiller);
				return;
			}
		}
		navigateToEpisode(nextEpisode);
	}

	function goToPrevEpisode() {
		if (skipFiller && anime?.episodes) {
			const currentIndex = anime.episodes.findIndex((ep: any) => 
				ep.id.replace(/\$/g, '-') === episodeId
			);
			const prevNonFiller = findNextNonFillerEpisode(currentIndex, 'prev');
			if (prevNonFiller) {
				navigateToEpisode(prevNonFiller);
				return;
			}
		}
		navigateToEpisode(prevEpisode);
	}

	function toggleSkipFiller() {
		skipFiller = !skipFiller;
		if (browser) {
			localStorage.setItem(SKIP_FILLER_STORAGE_KEY, skipFiller.toString());
		}
	}

	function changeLanguage(newLanguage: string) {
		selectedLanguage = newLanguage;
		goto(`/anime/${animeId}/watch/${episodeId}?language=${newLanguage}`);
	}

	// Computed values for button states when skip filler is enabled
	let canGoNext = !!nextEpisode;
	let canGoPrev = !!prevEpisode;
	
	$: {
		if (skipFiller && anime?.episodes) {
			const currentIndex = anime.episodes.findIndex((ep: any) => 
				ep.id.replace(/\$/g, '-') === episodeId
			);
			canGoNext = findNextNonFillerEpisode(currentIndex, 'next') !== null;
			canGoPrev = findNextNonFillerEpisode(currentIndex, 'prev') !== null;
		} else {
			canGoNext = !!nextEpisode;
			canGoPrev = !!prevEpisode;
		}
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
				bind:this={iframeElement}
				src={embedUrl}
				class="absolute top-0 left-0 w-full h-full"
				frameborder="0"
				scrolling="no"
				allowfullscreen
				title="Video Player"
				onload={handleIframeLoad}
			></iframe>
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
				onclick={() => window.location.reload()}
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

		<!-- Language Selection and Skip Filler Toggle -->
		<div class="mb-6 flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label for="language-select" class="text-sm font-medium text-white">Language:</label>
				<select
					id="language-select"
					bind:value={selectedLanguage}
					onchange={(e) => changeLanguage(e.currentTarget.value)}
					class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					{#each languages as langOption}
						<option value={langOption.name}>{langOption.label}</option>
					{/each}
				</select>
			</div>

			<!-- Skip Filler Toggle -->
			<div class="flex items-center gap-2">
				<label for="skip-filler-toggle" class="text-sm font-medium text-white cursor-pointer">
					Skip Filler:
				</label>
				<button
					id="skip-filler-toggle"
					type="button"
					role="switch"
					aria-checked={skipFiller}
					onclick={toggleSkipFiller}
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {skipFiller ? 'bg-blue-600' : 'bg-gray-600'}"
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {skipFiller ? 'translate-x-6' : 'translate-x-1'}"
					></span>
				</button>
			</div>
		</div>

		<!-- Navigation -->
		<div class="mb-8 flex items-center gap-4">
			<button
				onclick={goToPrevEpisode}
				disabled={!canGoPrev}
				class="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
			>
				← Previous
			</button>

			<button
				onclick={goToNextEpisode}
				disabled={!canGoNext}
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
