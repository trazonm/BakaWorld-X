<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import 'plyr/dist/plyr.css';

	// Dynamic imports for browser-only libraries
	let Plyr: any;
	let Hls: any;

	export let data: PageData;

	let {
		anime,
		episode,
		videoData,
		nextEpisode,
		prevEpisode,
		server,
		category,
		animeId,
		episodeId
	} = data;
	$: ({
		anime,
		episode,
		videoData,
		nextEpisode,
		prevEpisode,
		server,
		category,
		animeId,
		episodeId
	} = data);

	let videoElement: HTMLVideoElement;
	let player: any = null;
	let hls: any = null;
	let selectedServer = server;
	let selectedCategory = category;
	let loading = false;
	let error = '';
	let loadingTimeout: NodeJS.Timeout | null = null;

	const servers = [
		{ name: 'hd-1', label: 'HD-1' },
		{ name: 'hd-2', label: 'HD-2 (Recommended)' },
		{ name: 'hd-3', label: 'HD-3' }
	];

	const categories = [
		{ name: 'sub', label: 'Subbed' },
		{ name: 'dub', label: 'Dubbed' }
	];

	onMount(async () => {
		if (browser) {
			try {
				const [PlyrModule, HlsModule] = await Promise.all([
					import('plyr'), 
					import('hls.js')
				]);

				Plyr = PlyrModule.default;
				Hls = HlsModule.default;

				setupPlayer();
				setupVideoSource();
			} catch (error) {
				console.error('Error loading libraries:', error);
				error = 'Failed to load video libraries';
			}
		}
	});

	onDestroy(() => {
		cleanup();
	});

	async function setupPlayer() {
		if (!browser || !videoElement || !Plyr) return;

		loading = true;
		error = '';

		player = new Plyr(videoElement, {
			controls: [
				'play-large',
				'restart',
				'play',
				'progress',
				'current-time',
				'duration',
				'mute',
				'volume',
				'settings',
				'pip',
				'fullscreen'
			],
			settings: ['quality', 'speed'],
			keyboard: { focused: true, global: false },
			clickToPlay: true,
			hideControls: true
		});

		player.on('ready', () => {
			console.log('Player ready');
		});
	}

	function clearLoadingTimeout() {
		if (loadingTimeout) {
			clearTimeout(loadingTimeout);
			loadingTimeout = null;
		}
	}

	function setupVideoSource() {
		if (!videoData?.data?.sources?.length) {
			error = 'No video sources available';
			loading = false;
			return;
		}

		// Clear previous error and timeout
		error = '';
		loading = true;
		clearLoadingTimeout();

		// Set a loading timeout to prevent infinite loading
		loadingTimeout = setTimeout(() => {
			if (loading) {
				loading = false;
				error = 'Video loading timeout. Try refreshing or switching servers.';
			}
		}, 30000);

		const source = videoData.data.sources[0];
		const videoUrl = source.isM3U8
			? `/api/proxy/m3u8?url=${encodeURIComponent(source.url)}`
			: `/api/proxy/video?url=${encodeURIComponent(source.url)}`;

		// Set source using Plyr
		if (source.isM3U8 && Hls.isSupported()) {
			// Use HLS.js for M3U8 streams
			if (hls) {
				hls.destroy();
			}

			hls = new Hls({
				enableWorker: false,
				lowLatencyMode: true,
				backBufferLength: 90
			});

			hls.loadSource(videoUrl);
			hls.attachMedia(videoElement);

			hls.on(Hls.Events.MANIFEST_PARSED, () => {
				loading = false;
				clearLoadingTimeout();
			});

			hls.on(Hls.Events.ERROR, (event: any, data: any) => {
				console.error('HLS Error:', data);
				if (data.fatal) {
					error = `Server ${selectedServer.toUpperCase()} failed to load. Try HD-2 server.`;
					loading = false;
					clearLoadingTimeout();
				}
			});
		} else {
			// Direct video source
			player.source = {
				type: 'video',
				sources: [{ src: videoUrl, type: source.isM3U8 ? 'application/x-mpegURL' : 'video/mp4' }]
			};
			loading = false;
			clearLoadingTimeout();
		}
	}

	function cleanup() {
		clearLoadingTimeout();

		if (hls) {
			hls.destroy();
			hls = null;
		}
		if (player) {
			player.destroy();
			player = null;
		}
	}

	function navigateToEpisode(episode: any) {
		if (!episode) return;
		const episodeId = episode.id.replace(/\$/g, '-');
		goto(`/anime/${animeId}/watch/${episodeId}?server=${selectedServer}&category=${selectedCategory}`);
	}

	function goToNextEpisode() {
		navigateToEpisode(nextEpisode);
	}

	function goToPrevEpisode() {
		navigateToEpisode(prevEpisode);
	}

	function changeServer(newServer: string) {
		selectedServer = newServer;
		goto(`/anime/${animeId}/watch/${episodeId}?server=${newServer}&category=${selectedCategory}`);
	}

	function changeCategory(newCategory: string) {
		selectedCategory = newCategory;
		goto(`/anime/${animeId}/watch/${episodeId}?server=${selectedServer}&category=${newCategory}`);
	}

	// Reload video source when data changes
	$: if (browser && videoData?.data?.sources?.length && player) {
		setupVideoSource();
	}
</script>

<svelte:head>
	<title>{episode.title} - {anime.title} - BakaWorld X</title>
	<meta name="description" content="Watch {episode.title} from {anime.title}" />
</svelte:head>

<div class="min-h-screen bg-black">
	<!-- Video Player -->
	<div class="relative w-full">
		{#if videoData?.data?.sources?.length > 0}
			<video
				bind:this={videoElement}
				class="h-auto max-h-screen w-full"
				playsinline
				crossorigin="anonymous"
			>
				<track kind="captions" />
			</video>

			{#if loading}
				<div
					class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-black backdrop-blur-sm"
				>
					<div class="flex flex-col items-center gap-4">
						<div
							class="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
						></div>
						<p class="text-lg font-medium text-white">Loading video...</p>
						<p class="text-sm text-gray-400">
							Server: {selectedServer.toUpperCase()} • Category: {selectedCategory.toUpperCase()}
						</p>
					</div>
				</div>
			{/if}
		{:else}
			<div class="flex h-96 items-center justify-center text-white">
				<div class="max-w-lg text-center">
					<div class="mb-4 text-xl text-red-400">
						{error || 'Unable to load video'}
					</div>

					{#if error.includes('timeout')}
						<div class="mb-4 rounded-lg border border-yellow-600 bg-yellow-900 p-4">
							<p class="mb-2 text-sm text-yellow-200">
								<strong>Loading Timeout:</strong> The video took too long to load.
							</p>
							<p class="text-sm text-yellow-300">
								This usually indicates server issues. Try switching to <strong>HD-2</strong> server.
							</p>
						</div>
					{:else if error.includes('failed')}
						<div class="mb-4 rounded-lg border border-orange-600 bg-orange-900 p-4">
							<p class="mb-2 text-sm text-orange-200">
								<strong>Server Error:</strong> The selected server is currently unavailable.
							</p>
							<p class="text-sm text-orange-300">
								Try switching to a different server using the dropdown above.
							</p>
						</div>
					{:else}
						<div class="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
							<p class="mb-2 text-sm text-gray-300">
								<strong>Troubleshooting Tips:</strong>
							</p>
							<ul class="list-inside list-disc text-left text-sm text-gray-400">
								<li>Try switching to HD-2 server (most reliable)</li>
								<li>Try switching between Subbed/Dubbed content</li>
								<li>Clear your browser cache and reload</li>
								<li>Disable any ad blockers or privacy extensions</li>
							</ul>
						</div>
					{/if}

					<div class="flex justify-center gap-3">
						<button
							class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
							on:click={() => {
								error = '';
								if (browser && player) {
									setupVideoSource();
								}
							}}
						>
							Retry
						</button>

						<button
							class="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
							on:click={() => changeServer('hd-2')}
						>
							Try HD-2 Server
						</button>
					</div>
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

		<!-- Server/Category Selection -->
		<div class="mb-6 flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label for="server-select" class="text-sm font-medium text-white">Server:</label>
				<select
					id="server-select"
					bind:value={selectedServer}
					on:change={(e) => changeServer(e.currentTarget.value)}
					class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					{#each servers as serverOption}
						<option value={serverOption.name}>{serverOption.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2">
				<label for="category-select" class="text-sm font-medium text-white">Category:</label>
				<select
					id="category-select"
					bind:value={selectedCategory}
					on:change={(e) => changeCategory(e.currentTarget.value)}
					class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					{#each categories as categoryOption}
						<option value={categoryOption.name}>{categoryOption.label}</option>
					{/each}
				</select>
			</div>

			{#if error}
				<div class="text-sm text-orange-400">
					💡 Having issues? Try switching to HD-2 server or refresh the page.
				</div>
			{/if}
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

		<!-- Keyboard Shortcuts -->
		<div class="rounded-lg bg-gray-800 p-4">
			<h3 class="mb-3 font-semibold text-white">Keyboard Shortcuts</h3>
			<div class="grid grid-cols-2 gap-3 text-sm text-gray-300 md:grid-cols-4">
				<div><kbd class="rounded bg-gray-700 px-2 py-1">Space</kbd> Play/Pause</div>
				<div><kbd class="rounded bg-gray-700 px-2 py-1">F</kbd> Fullscreen</div>
				<div><kbd class="rounded bg-gray-700 px-2 py-1">M</kbd> Mute/Unmute</div>
				<div><kbd class="rounded bg-gray-700 px-2 py-1">← →</kbd> Seek ±10s</div>
				<div><kbd class="rounded bg-gray-700 px-2 py-1">↑ ↓</kbd> Volume ±5%</div>
				<div><kbd class="rounded bg-gray-700 px-2 py-1">C</kbd> Toggle Captions</div>
			</div>
		</div>
	</div>
</div>
