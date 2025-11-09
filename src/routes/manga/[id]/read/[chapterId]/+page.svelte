<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	
	export let data: PageData;
	$: chapter = data.chapter;
	$: manga = data.manga;
	$: nextChapter = data.nextChapter;
	$: prevChapter = data.prevChapter;

	$: pages = chapter?.pages || [];
	$: currentChapterIndex = data.currentChapterIndex;
	
	// Compute manga title (handle null title)
	$: mangaTitle = manga?.title || 'Manga';
	
	let viewerContainer: HTMLDivElement;
	let isFullscreen = false;
	let loadingPages = false;
	
	function toggleFullscreen() {
		if (!viewerContainer) return;
		
		if (!isFullscreen) {
			// Enter fullscreen
			if (viewerContainer.requestFullscreen) {
				viewerContainer.requestFullscreen();
			} else if ((viewerContainer as any).webkitRequestFullscreen) {
				(viewerContainer as any).webkitRequestFullscreen();
			} else if ((viewerContainer as any).mozRequestFullScreen) {
				(viewerContainer as any).mozRequestFullScreen();
			} else if ((viewerContainer as any).msRequestFullscreen) {
				(viewerContainer as any).msRequestFullscreen();
			}
		} else {
			// Exit fullscreen
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if ((document as any).webkitExitFullscreen) {
				(document as any).webkitExitFullscreen();
			} else if ((document as any).mozCancelFullScreen) {
				(document as any).mozCancelFullScreen();
			} else if ((document as any).msExitFullscreen) {
				(document as any).msExitFullscreen();
			}
		}
	}
	
	function handleFullscreenChange() {
		isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement);
	}
	
	onMount(() => {
		// Listen for fullscreen changes
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mozfullscreenchange', handleFullscreenChange);
		document.addEventListener('MSFullscreenChange', handleFullscreenChange);
		
		// Preload all images
		if (pages.length > 0) {
			loadingPages = true;
			const imagePromises = pages.map((page) => {
				return new Promise((resolve) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.onerror = () => resolve(null);
					img.src = page.img;
				});
			});
			
			Promise.all(imagePromises).then(() => {
				loadingPages = false;
			});
		}
		
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
			document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
		};
	});
</script>

<svelte:head>
	<title>
		{manga ? `${manga.title} - Chapter - BakaWorld χ` : 'Manga Reader - BakaWorld χ'}
	</title>
</svelte:head>

<style>
	/* Override global overflow for this page only */
	:global(html), :global(body) {
		overflow-y: auto !important;
		height: auto !important;
	}

	.manga-viewer {
		background: var(--theme-bg-secondary);
		border-radius: 0.5rem;
		overflow: hidden;
		position: relative;
		max-width: 100%;
	}

	.manga-viewer:fullscreen {
		background: var(--theme-bg-primary);
		padding: 1rem;
		overflow-y: auto;
	}

	.manga-viewer:-webkit-full-screen {
		background: var(--theme-bg-primary);
		padding: 1rem;
		overflow-y: auto;
	}

	.manga-viewer:-moz-full-screen {
		background: var(--theme-bg-primary);
		padding: 1rem;
		overflow-y: auto;
	}

	.manga-viewer:-ms-fullscreen {
		background: var(--theme-bg-primary);
		padding: 1rem;
		overflow-y: auto;
	}

	.manga-page-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
	}

	.manga-viewer:fullscreen .manga-page-container {
		padding: 0;
		gap: 0;
	}

	.manga-viewer:-webkit-full-screen .manga-page-container {
		padding: 0;
		gap: 0;
	}

	.manga-viewer:-moz-full-screen .manga-page-container {
		padding: 0;
		gap: 0;
	}

	.manga-viewer:-ms-fullscreen .manga-page-container {
		padding: 0;
		gap: 0;
	}

	.manga-page {
		max-width: 100%;
		width: auto;
		height: auto;
		display: block;
		margin: 0 auto;
		object-fit: contain;
		touch-action: pinch-zoom;
		cursor: zoom-in;
	}

	.manga-viewer:fullscreen .manga-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pinch-zoom;
	}

	.manga-viewer:-webkit-full-screen .manga-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pinch-zoom;
	}

	.manga-viewer:-moz-full-screen .manga-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pinch-zoom;
	}

	.manga-viewer:-ms-fullscreen .manga-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pinch-zoom;
	}

	.fullscreen-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 10;
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		backdrop-filter: blur(4px);
	}

	.fullscreen-button:hover {
		background: rgba(0, 0, 0, 0.9);
		border-color: rgba(255, 255, 255, 0.5);
		transform: scale(1.05);
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 5;
		border-radius: 0.5rem;
	}

	.spinner {
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-top: 4px solid #3b82f6;
		border-radius: 50%;
		width: 3rem;
		height: 3rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>

<div class="manga-reader-container theme-bg-primary">
	<main class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Navigation Header -->
		<div class="bg-gray-900 rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
			<div>
				{#if manga}
					<a href="/manga/{manga.id}" class="text-blue-400 hover:text-blue-300 text-sm mb-1 block">
						← Back to {mangaTitle}
					</a>
					<h1 class="text-white text-xl font-bold">{mangaTitle}</h1>
				{/if}
			</div>
			
			<div class="flex gap-4 items-center">
				{#if prevChapter && manga}
					<a 
						href="/manga/{manga.id}/read/{prevChapter.id}"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
					>
						← Previous Chapter
					</a>
				{/if}
				
				{#if nextChapter && manga}
					<a 
						href="/manga/{manga.id}/read/{nextChapter.id}"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
					>
						Next Chapter →
					</a>
				{/if}
			</div>
		</div>

		<!-- Manga Viewer Container -->
		{#if pages.length > 0}
			<div class="manga-viewer" bind:this={viewerContainer}>
				<!-- Fullscreen Button -->
				<button 
					class="fullscreen-button"
					on:click={toggleFullscreen}
					title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F11)'}
				>
					{#if isFullscreen}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 21H5a2 2 0 01-2-2v-4m6 6h10a2 2 0 002-2v-4" />
						</svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
						</svg>
					{/if}
				</button>

				<!-- Loading Overlay -->
				{#if loadingPages}
					<div class="loading-overlay">
						<div class="spinner"></div>
					</div>
				{/if}

				<!-- Manga Pages Container -->
				<div class="manga-page-container">
					{#each pages as page, index}
						<img 
							src={page.img} 
							alt="Page {page.page || index + 1}"
							class="manga-page"
							loading="lazy"
						/>
					{/each}
				</div>
			</div>
		{:else}
			<div class="bg-gray-900 rounded-lg p-8 text-center">
				<p class="text-gray-400 text-lg">No pages available for this chapter</p>
			</div>
		{/if}
	</main>
</div>

