<script lang="ts">
	import type { PageData } from './$types';
	import type { ComicPage } from '$lib/types/comic';
	import { onMount } from 'svelte';
	
	export let data: PageData;
	$: issue = data.issue;
	$: comic = data.comic;
	$: nextIssue = data.nextIssue;
	$: prevIssue = data.prevIssue;

	$: pages = issue?.pages || [];
	$: currentIssueIndex = data.currentIssueIndex;
	
	// Compute comic title (handle null title)
	$: comicTitle = comic?.title || 'Comic';
	
	let viewerContainer: HTMLDivElement;
	let isFullscreen = false;
	let loadingPages = false;
	let currentPage = 0;
	let touchStartX = 0;
	let touchEndX = 0;
	
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
	
	function nextPage() {
		if (currentPage < pages.length - 1) {
			currentPage++;
		}
	}
	
	function prevPage() {
		if (currentPage > 0) {
			currentPage--;
		}
	}
	
	function goToPage(pageIndex: number) {
		if (pageIndex >= 0 && pageIndex < pages.length) {
			currentPage = pageIndex;
		}
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'PageDown') {
			e.preventDefault();
			nextPage();
		} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
			e.preventDefault();
			prevPage();
		} else if (e.key === 'Home') {
			e.preventDefault();
			goToPage(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			goToPage(pages.length - 1);
		}
	}
	
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}
	
	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].clientX;
		handleSwipe();
	}
	
	function handleSwipe() {
		const swipeThreshold = 50;
		const diff = touchStartX - touchEndX;
		
		if (Math.abs(diff) > swipeThreshold) {
			if (diff > 0) {
				// Swiped left - next page
				nextPage();
			} else {
				// Swiped right - previous page
				prevPage();
			}
		}
	}
	
	onMount(() => {
		// Listen for fullscreen changes
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mozfullscreenchange', handleFullscreenChange);
		document.addEventListener('MSFullscreenChange', handleFullscreenChange);
		
		// Listen for keyboard navigation
		document.addEventListener('keydown', handleKeydown);
		
		// Preload all images
		if (pages.length > 0) {
			loadingPages = true;
			const imagePromises = pages.map((page: ComicPage) => {
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
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head>
	<title>
		{comic ? `${comic.title} - Issue - BakaWorld χ` : 'Comic Reader - BakaWorld χ'}
	</title>
</svelte:head>

<style>
	/* Override global overflow for this page only */
	:global(html), :global(body) {
		overflow-y: auto !important;
		height: auto !important;
	}

	.comic-viewer {
		background: #1a1a1a;
		border-radius: 0.5rem;
		overflow: hidden;
		position: relative;
		max-width: 100%;
	}

	.comic-viewer:fullscreen {
		background: #000;
		padding: 1rem;
		overflow-y: auto;
	}

	.comic-viewer:-webkit-full-screen {
		background: #000;
		padding: 1rem;
		overflow-y: auto;
	}

	.comic-viewer:-moz-full-screen {
		background: #000;
		padding: 1rem;
		overflow-y: auto;
	}

	.comic-viewer:-ms-fullscreen {
		background: #000;
		padding: 1rem;
		overflow-y: auto;
	}

	.comic-page-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		min-height: 500px;
		position: relative;
	}

	.comic-viewer:fullscreen .comic-page-container {
		padding: 0;
		min-height: 100vh;
	}

	.comic-viewer:-webkit-full-screen .comic-page-container {
		padding: 0;
		min-height: 100vh;
	}

	.comic-viewer:-moz-full-screen .comic-page-container {
		padding: 0;
		min-height: 100vh;
	}

	.comic-viewer:-ms-fullscreen .comic-page-container {
		padding: 0;
		min-height: 100vh;
	}

	.comic-page {
		max-width: 100%;
		width: auto;
		height: auto;
		display: block;
		margin: 0 auto;
		object-fit: contain;
		touch-action: pan-y pinch-zoom;
		cursor: zoom-in;
	}

	.comic-viewer:fullscreen .comic-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pan-y pinch-zoom;
	}

	.comic-viewer:-webkit-full-screen .comic-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pan-y pinch-zoom;
	}

	.comic-viewer:-moz-full-screen .comic-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pan-y pinch-zoom;
	}

	.comic-viewer:-ms-fullscreen .comic-page {
		max-width: none;
		max-height: none;
		width: 100%;
		height: auto;
		touch-action: pan-y pinch-zoom;
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

	.page-navigation {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.5rem;
		width: 100%;
		max-width: 600px;
	}

	.comic-viewer:fullscreen .page-navigation {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.8);
		padding: 1rem 2rem;
		border-radius: 2rem;
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.2);
		z-index: 20;
	}

	.comic-viewer:-webkit-full-screen .page-navigation {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.8);
		padding: 1rem 2rem;
		border-radius: 2rem;
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.2);
		z-index: 20;
	}

	.comic-viewer:-moz-full-screen .page-navigation {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.8);
		padding: 1rem 2rem;
		border-radius: 2rem;
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.2);
		z-index: 20;
	}

	.comic-viewer:-ms-fullscreen .page-navigation {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.8);
		padding: 1rem 2rem;
		border-radius: 2rem;
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.2);
		z-index: 20;
	}

	.nav-button {
		background: rgba(59, 130, 246, 0.9);
		border: 2px solid rgba(59, 130, 246, 0.5);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		backdrop-filter: blur(4px);
	}

	.nav-button:hover:not(:disabled) {
		background: rgba(59, 130, 246, 1);
		border-color: rgba(59, 130, 246, 0.8);
		transform: scale(1.05);
	}

	.nav-button:disabled {
		background: rgba(75, 85, 99, 0.5);
		border-color: rgba(75, 85, 99, 0.3);
		cursor: not-allowed;
		opacity: 0.5;
	}

	.page-counter {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1.1rem;
		white-space: nowrap;
		backdrop-filter: blur(4px);
	}

	.arrow-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>

<div class="comic-reader-container min-h-screen bg-black">
	<main class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Navigation Header -->
		<div class="bg-gray-900 rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
			<div>
				{#if comic}
					<a href="/comics/{comic.id}" class="text-blue-400 hover:text-blue-300 text-sm mb-1 block">
						← Back to {comicTitle}
					</a>
					<h1 class="text-white text-xl font-bold">{comicTitle}</h1>
				{/if}
			</div>
			
			<div class="flex gap-4 items-center">
				{#if prevIssue && comic}
					<a 
						href="/comics/{comic.id}/read/{prevIssue.id}"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
					>
						← Previous Issue
					</a>
				{/if}
				
				{#if nextIssue && comic}
					<a 
						href="/comics/{comic.id}/read/{nextIssue.id}"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
					>
						Next Issue →
					</a>
				{/if}
			</div>
		</div>

		<!-- Comic Viewer Container -->
		{#if pages.length > 0}
			<div class="comic-viewer" bind:this={viewerContainer}>
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

			<!-- Comic Pages Container -->
			<div 
				class="comic-page-container"
				on:touchstart={handleTouchStart}
				on:touchend={handleTouchEnd}
			>
				{#if pages[currentPage]}
					<img 
						src={`/api/proxy/image?url=${encodeURIComponent(pages[currentPage].img)}&referer=https://readcomicsonline.ru/`}
						alt="Page {pages[currentPage].page || currentPage + 1}"
						class="comic-page"
						on:error={(e) => {
							console.error('Failed to load image:', pages[currentPage].img);
						}}
					/>
				{/if}

				<!-- Page Navigation -->
				<div class="page-navigation">
					<button 
						class="nav-button"
						on:click={prevPage}
						disabled={currentPage === 0}
						title="Previous page (← or PageUp)"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="arrow-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						<span class="hidden sm:inline">Previous</span>
					</button>

					<div class="page-counter">
						{currentPage + 1} / {pages.length}
					</div>

					<button 
						class="nav-button"
						on:click={nextPage}
						disabled={currentPage === pages.length - 1}
						title="Next page (→ or PageDown)"
					>
						<span class="hidden sm:inline">Next</span>
						<svg xmlns="http://www.w3.org/2000/svg" class="arrow-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
			</div>
		{:else}
			<div class="bg-gray-900 rounded-lg p-8 text-center">
				<p class="text-gray-400 text-lg mb-2">No pages available for this issue</p>
				<p class="text-gray-500 text-sm">
					Note: Comic Vine API provides metadata only. For actual comic reading, consider integrating with a reading service.
				</p>
			</div>
		{/if}
	</main>
</div>

