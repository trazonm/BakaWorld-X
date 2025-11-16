<!-- Premiumizer Page - YouTube & Spotify -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import type { YouTubeVideoInfo } from '$lib/types/youtube';
	import type { SpotifyTrackInfo } from '$lib/types/spotify';

	type MediaType = 'youtube' | 'spotify';
	
	let mediaType: MediaType = 'youtube';
	let url = '';
	let loading = false;
	let error = '';
	let videoInfo: YouTubeVideoInfo | null = null;
	let trackInfo: SpotifyTrackInfo | null = null;
	let selectedFormat: 'video' | 'audio' = 'video';
	let selectedQuality = '1080p';
	let selectedAudioFormat: 'mp3' | 'wav' | 'flac' = 'mp3';
	let audioBitrate = 320;
	let selectedSpotifyFormat: 'flac' | 'mp3' = 'flac';
	let downloading = false;
	let downloadProgress = 0;
	let downloadStage = '';
	let eventSource: EventSource | null = null;

	function getSafeFileName(title: string | undefined, extension: string, artist?: string): string {
		const invalidChars = /[<>:"/\\|?*\u0000-\u001F]/g;
		if (mediaType === 'spotify' && artist) {
			const base = `${artist} - ${title || 'spotify_track'}`.replace(invalidChars, '').trim() || 'spotify_track';
			return `${base}${extension}`;
		}
		const base = (title || 'download').replace(invalidChars, '').trim() || 'download';
		return `${base}${extension}`;
	}

	function resetForm() {
		url = '';
		error = '';
		videoInfo = null;
		trackInfo = null;
		loading = false;
		downloading = false;
		downloadProgress = 0;
		downloadStage = '';
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	}

	onMount(async () => {
		await refreshAuth();
		const { isLoggedIn } = get(auth);
		if (!isLoggedIn) {
			goto('/');
		}
	});

	async function handleGetInfo(e?: Event) {
		if (e) {
			e.preventDefault();
		}
		
		if (!url.trim()) {
			error = `Please enter a ${mediaType === 'youtube' ? 'YouTube' : 'Spotify'} URL`;
			return;
		}

		loading = true;
		error = '';
		videoInfo = null;
		trackInfo = null;

		try {
			if (mediaType === 'youtube') {
				const res = await fetch('/api/youtube/info', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: url.trim() })
				});

				const data = await res.json();

				if (res.ok) {
					videoInfo = data;
				} else {
					error = data.error || 'Failed to get video information';
				}
			} else {
				const res = await fetch('/api/spotify/info', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: url.trim() })
				});

				const data = await res.json();

				if (res.ok) {
					trackInfo = data;
				} else {
					error = data.error || 'Failed to get track information';
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Network error';
		} finally {
			loading = false;
		}
	}

	async function handleDownload() {
		if (mediaType === 'youtube' && !videoInfo || mediaType === 'spotify' && !trackInfo || downloading) return;

		downloading = true;
		error = '';
		downloadProgress = 0;
		downloadStage = 'Initializing download...';

		// Generate progress ID
		const progressId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

		// Set up SSE for progress updates
		const progressEndpoint = mediaType === 'youtube' 
			? `/api/youtube/download-progress?id=${progressId}`
			: `/api/spotify/download-progress?id=${progressId}`;
		
		eventSource = new EventSource(progressEndpoint);
		
		eventSource.onopen = () => {
			console.log('SSE connection opened for progress tracking');
			downloadStage = 'Connected, starting download...';
		};
		
		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === 'connected') {
					console.log('SSE connected, waiting for progress updates...');
					downloadStage = 'Connected, preparing download...';
				} else if (data.type === 'progress') {
					downloadProgress = data.progress;
					downloadStage = data.stage;
					console.log(`Progress update: ${data.progress}% - ${data.stage}`);
				}
			} catch (err) {
				console.error('Error parsing progress data:', err);
			}
		};

		eventSource.onerror = (error) => {
			console.error('SSE connection error:', error);
		};

		try {
			let body: any;
			let endpoint: string;

			if (mediaType === 'youtube') {
				endpoint = '/api/youtube/download-link';
				body = {
					url: url.trim(),
					format: selectedFormat,
					progressId,
					title: videoInfo?.title
				};

				if (selectedFormat === 'video') {
					body.quality = selectedQuality;
				} else {
					body.audioFormat = selectedAudioFormat;
					if (selectedAudioFormat === 'mp3') {
						body.audioBitrate = audioBitrate;
					}
				}
			} else {
				endpoint = '/api/spotify/download-link';
				body = {
					url: url.trim(),
					format: selectedSpotifyFormat,
					progressId,
					title: trackInfo?.title,
					artist: trackInfo?.artist
				};
			}

			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Download failed';
				downloading = false;
				eventSource?.close();
				eventSource = null;
				return;
			}

			const data = await res.json();
			
			if (!data.success || !data.downloadUrl) {
				error = 'Failed to generate download link';
				downloading = false;
				eventSource?.close();
				eventSource = null;
				return;
			}

			// Step 2: Trigger browser download with the direct link
			downloadStage = 'Starting download...';
			downloadProgress = 100;
			
			let extension = mediaType === 'youtube' ? (selectedFormat === 'video' ? '.mp4' : selectedAudioFormat === 'mp3' ? '.mp3' : selectedAudioFormat === 'wav' ? '.wav' : '.flac') : `.${selectedSpotifyFormat}`;

			let filename: string;
			if (mediaType === 'youtube') {
				filename = data.filename || getSafeFileName(videoInfo?.title, extension);
			} else {
				filename = data.filename || getSafeFileName(trackInfo?.title, extension, trackInfo?.artist);
			}
			
			// Create download link
			const a = document.createElement('a');
			a.href = data.downloadUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			
			downloadStage = 'Download started! Check your browser downloads.';

			// Clean up
			setTimeout(() => {
				eventSource?.close();
				eventSource = null;
				downloading = false;
				downloadProgress = 0;
				downloadStage = '';
			}, 2000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Download failed';
			downloading = false;
			eventSource?.close();
			eventSource = null;
			downloadProgress = 0;
			downloadStage = '';
		}
	}

	function formatDuration(seconds?: number): string {
		if (!seconds) return 'Unknown';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}

	function formatViews(views?: number): string {
		if (!views) return 'Unknown';
		if (views >= 1000000) {
			return `${(views / 1000000).toFixed(1)}M`;
		}
		if (views >= 1000) {
			return `${(views / 1000).toFixed(1)}K`;
		}
		return views.toString();
	}

	function handleMediaTypeChange(newType: MediaType) {
		if (mediaType !== newType) {
			mediaType = newType;
			resetForm();
		}
	}
</script>

<svelte:head>
	<title>BakaWorld χ - Premiumizer</title>
</svelte:head>

<main class="text-white">
	<div class="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-4">
				<span class="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
					Media Downloader
				</span>
			</h1>
			<p class="text-gray-400 text-lg">Download YouTube videos/audio and Spotify tracks in FLAC quality</p>
		</div>

		<!-- Media Type Tabs -->
		<div class="bg-gray-900 rounded-lg border border-gray-700 p-1 mb-6 flex gap-2">
			<button
				type="button"
				on:click={() => handleMediaTypeChange('youtube')}
				class="flex-1 rounded-lg px-4 py-3 font-semibold transition-colors {mediaType === 'youtube' 
					? 'bg-red-600 text-white' 
					: 'text-gray-300 hover:bg-gray-800'}"
				disabled={loading || downloading}
			>
				YouTube
			</button>
			<button
				type="button"
				on:click={() => handleMediaTypeChange('spotify')}
				class="flex-1 rounded-lg px-4 py-3 font-semibold transition-colors {mediaType === 'spotify' 
					? 'bg-green-600 text-white' 
					: 'text-gray-300 hover:bg-gray-800'}"
				disabled={loading || downloading}
			>
				Spotify
			</button>
		</div>

		<!-- URL Input Form -->
		<div class="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-6">
			<form
				on:submit={handleGetInfo}
				class="space-y-4"
			>
				<div>
					<label for="url" class="block text-sm font-medium text-gray-300 mb-2">
						{mediaType === 'youtube' ? 'YouTube' : 'Spotify'} URL
					</label>
					<div class="flex gap-2">
						<input
							id="url"
							type="url"
							bind:value={url}
							placeholder={mediaType === 'youtube' 
								? 'https://www.youtube.com/watch?v=...' 
								: 'https://open.spotify.com/track/...'}
							class="flex-1 rounded-lg bg-gray-800 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 placeholder-gray-400"
							required
							disabled={loading || downloading}
						/>
						<button
							type="submit"
							class="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							disabled={loading || downloading || !url.trim()}
						>
							{#if loading}
								<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
								Loading...
							{:else}
								Get Info
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>

		<!-- Error Message -->
		{#if error}
			<div class="mb-6 p-4 rounded-lg bg-red-900/50 border border-red-700">
				<p class="text-red-200">{error}</p>
			</div>
		{/if}

		<!-- YouTube Video Info and Download Options -->
		{#if mediaType === 'youtube' && videoInfo}
			<div class="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-6">
				<!-- Video Info -->
				<div class="flex flex-col md:flex-row gap-4 mb-6">
					{#if videoInfo.thumbnail}
						<img
							src={videoInfo.thumbnail}
							alt={videoInfo.title}
							class="w-full md:w-48 h-auto rounded-lg object-cover"
						/>
					{/if}
					<div class="flex-1">
						<h2 class="text-xl font-bold text-white mb-2">{videoInfo.title}</h2>
						{#if videoInfo.channel}
							<p class="text-gray-400 mb-2">
								Channel: <span class="text-gray-300">{videoInfo.channel.name}</span>
							</p>
						{/if}
						<div class="flex flex-wrap gap-4 text-sm text-gray-400">
							<span>Duration: {formatDuration(videoInfo.duration)}</span>
							{#if videoInfo.views}
								<span>Views: {formatViews(videoInfo.views)}</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Format Selection -->
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">
							Download Format
						</label>
						<div class="flex gap-4">
							<label class="flex items-center cursor-pointer">
								<input
									type="radio"
									bind:group={selectedFormat}
									value="video"
									class="mr-2"
									disabled={downloading}
								/>
								<span class="text-gray-300">Video</span>
							</label>
							<label class="flex items-center cursor-pointer">
								<input
									type="radio"
									bind:group={selectedFormat}
									value="audio"
									class="mr-2"
									disabled={downloading}
								/>
								<span class="text-gray-300">Audio</span>
							</label>
						</div>
					</div>

					{#if selectedFormat === 'video'}
						<div>
							<label for="quality" class="block text-sm font-medium text-gray-300 mb-2">
								Video Quality
							</label>
							<select
								id="quality"
								bind:value={selectedQuality}
								class="w-full rounded-lg bg-gray-800 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
								disabled={downloading}
							>
								<option value="4k">4K (2160p)</option>
								<option value="1080p">1080p</option>
								<option value="720p">720p</option>
								<option value="480p">480p</option>
								<option value="360p">360p</option>
								<option value="240p">240p</option>
								<option value="144p">144p</option>
							</select>
						</div>
					{:else}
						<div class="space-y-4">
							<div>
								<label for="audioFormat" class="block text-sm font-medium text-gray-300 mb-2">
									Audio Format
								</label>
								<select
									id="audioFormat"
									bind:value={selectedAudioFormat}
									class="w-full rounded-lg bg-gray-800 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
									disabled={downloading}
								>
									<option value="mp3">MP3</option>
									<option value="wav">WAV</option>
									<option value="flac">FLAC</option>
								</select>
							</div>
							{#if selectedAudioFormat === 'mp3'}
								<div>
									<label for="bitrate" class="block text-sm font-medium text-gray-300 mb-2">
										MP3 Bitrate (kbps)
									</label>
									<select
										id="bitrate"
										bind:value={audioBitrate}
										class="w-full rounded-lg bg-gray-800 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
										disabled={downloading}
									>
										<option value={320}>320 kbps</option>
										<option value={256}>256 kbps</option>
										<option value={192}>192 kbps</option>
										<option value={128}>128 kbps</option>
									</select>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Progress Bar -->
					{#if downloading}
						<div class="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
							<div class="flex justify-between items-center mb-3">
								<div class="flex items-center gap-2">
									<span class="text-base font-medium text-white">{downloadStage || 'Starting download...'}</span>
									{#if downloadProgress > 0 && downloadProgress < 100}
										<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-900/50 text-red-300">
											In Progress
										</span>
									{/if}
								</div>
								<span class="text-base font-semibold text-red-400">{downloadProgress.toFixed(0)}%</span>
							</div>
							<div class="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
								<div
									class="bg-gradient-to-r from-red-600 to-red-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
									style="width: {Math.max(downloadProgress, 1)}%"
								></div>
							</div>
							{#if downloadProgress > 0 && downloadProgress < 100}
								<div class="text-xs text-gray-400 mt-1">
									Processing video... This may take a few minutes for longer videos.
								</div>
							{/if}
						</div>
					{/if}

					<button
						on:click={handleDownload}
						disabled={downloading}
						class="w-full rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{#if downloading}
							<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
							{downloadStage || 'Downloading...'}
						{:else}
							<svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
							</svg>
							Download {selectedFormat === 'video' ? selectedQuality.toUpperCase() : selectedAudioFormat.toUpperCase()}
						{/if}
					</button>
				</div>
			</div>
		{/if}

		<!-- Spotify Track Info and Download Options -->
		{#if mediaType === 'spotify' && trackInfo}
			<div class="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-6">
				<!-- Track Info -->
				<div class="flex flex-col md:flex-row gap-4 mb-6">
					{#if trackInfo.albumArt}
						<img
							src={trackInfo.albumArt}
							alt={trackInfo.title}
							class="w-full md:w-48 h-auto rounded-lg object-cover"
						/>
					{/if}
					<div class="flex-1">
						<h2 class="text-xl font-bold text-white mb-2">{trackInfo.title}</h2>
						<p class="text-gray-400 mb-2">
							Artist: <span class="text-gray-300">{trackInfo.artist}</span>
						</p>
						{#if trackInfo.album}
							<p class="text-gray-400 mb-2">
								Album: <span class="text-gray-300">{trackInfo.album}</span>
							</p>
						{/if}
						<div class="flex flex-wrap gap-4 text-sm text-gray-400">
							{#if trackInfo.duration}
								<span>Duration: {formatDuration(trackInfo.duration)}</span>
							{/if}
							{#if trackInfo.releaseDate}
								<span>Released: {trackInfo.releaseDate}</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Format Selection -->
				<div class="space-y-4">
					<div>
						<label for="spotifyFormat" class="block text-sm font-medium text-gray-300 mb-2">
							Audio Format
						</label>
						<select
							id="spotifyFormat"
							bind:value={selectedSpotifyFormat}
							class="w-full rounded-lg bg-gray-800 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-700"
							disabled={downloading}
						>
							<option value="flac">FLAC (Lossless)</option>
							<option value="mp3">MP3 (320kbps)</option>
						</select>
					</div>

					<div class="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
						<p class="text-sm text-blue-300">
							<strong>Note:</strong> This downloads tracks from Spotify using spotdl, which uses YouTube Music as the audio source. 
							Requires spotdl to be installed on the server (<code class="text-xs bg-gray-800 px-1 py-0.5 rounded">pip install spotdl</code>).
						</p>
						<p class="text-sm text-green-300 mt-2">
							✓ Downloads from YouTube Music (no DRM issues)
							<br />
							✓ Embeds Spotify metadata and album art
							<br />
							✓ Supports FLAC (lossless) and MP3 (320kbps)
						</p>
					</div>

					<!-- Progress Bar -->
					{#if downloading}
						<div class="w-full mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
							<div class="flex justify-between items-center mb-3">
								<div class="flex items-center gap-2">
									<span class="text-base font-medium text-white">{downloadStage || 'Starting download...'}</span>
									{#if downloadProgress > 0 && downloadProgress < 100}
										<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-900/50 text-green-300">
											In Progress
										</span>
									{/if}
								</div>
								<span class="text-base font-semibold text-green-400">{downloadProgress.toFixed(0)}%</span>
							</div>
							<div class="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
								<div
									class="bg-gradient-to-r from-green-600 to-green-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
									style="width: {Math.max(downloadProgress, 1)}%"
								></div>
							</div>
							{#if downloadProgress > 0 && downloadProgress < 100}
								<div class="text-xs text-gray-400 mt-1">
									Downloading from YouTube Music via spotdl...
								</div>
							{/if}
						</div>
					{/if}

					<button
						on:click={handleDownload}
						disabled={downloading}
						class="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{#if downloading}
							<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
							{downloadStage || 'Downloading...'}
						{:else}
							<svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
							</svg>
							Download {selectedSpotifyFormat.toUpperCase()}
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</main>
