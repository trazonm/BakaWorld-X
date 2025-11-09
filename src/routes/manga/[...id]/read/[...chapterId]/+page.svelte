<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { navigating } from '$app/stores';
	
	export let data: PageData;
	$: chapter = data.chapter;
	$: manga = data.manga;
	$: nextChapter = data.nextChapter;
	$: prevChapter = data.prevChapter;
	$: pages = chapter?.pages || [];
	$: mangaTitle = manga?.title || 'Manga';
	
	// Strip prefixes from IDs for clean URLs
	$: cleanMangaId = manga?.id ? (manga.id.startsWith('manga/') ? manga.id.substring(6) : manga.id) : '';
	$: cleanPrevChapterId = prevChapter?.id ? (prevChapter.id.startsWith('chapters/') ? prevChapter.id.substring(9) : prevChapter.id) : '';
	$: cleanNextChapterId = nextChapter?.id ? (nextChapter.id.startsWith('chapters/') ? nextChapter.id.substring(9) : nextChapter.id) : '';
	
	// Track navigation loading state
	$: isNavigating = !!$navigating;
	
	let viewerContainer: HTMLDivElement;
	let imageContainer: HTMLDivElement;
	let isFullscreen = false;
	let currentPage = 0;
	let imageLoading = true;
	
	// Zoom and pan state
	let scale = 1;
	let posX = 0;
	let posY = 0;
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let lastPosX = 0;
	let lastPosY = 0;
	
	// Touch state
	let initialDistance = 0;
	let initialScale = 1;
	
	// Reset to page 1 when chapter changes
	$: if (chapter) {
		currentPage = 0;
		resetZoom();
	}
	
	function toggleFullscreen() {
		if (!viewerContainer) return;
		
		if (!isFullscreen) {
			if (viewerContainer.requestFullscreen) {
				viewerContainer.requestFullscreen();
			} else if ((viewerContainer as any).webkitRequestFullscreen) {
				(viewerContainer as any).webkitRequestFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	}
	
	function handleFullscreenChange() {
		isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
	}
	
	function nextPage() {
		if (currentPage < pages.length - 1) {
			currentPage++;
			resetZoom();
			imageLoading = true;
		}
	}
	
	function prevPage() {
		if (currentPage > 0) {
			currentPage--;
			resetZoom();
			imageLoading = true;
		}
	}
	
	function resetZoom() {
		scale = 1;
		posX = 0;
		posY = 0;
	}
	
	function updateTransform() {
		if (imageContainer) {
			imageContainer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
		}
	}
	
	function constrainPosition() {
		if (!imageContainer) return;
		
		const rect = imageContainer.getBoundingClientRect();
		const parentRect = imageContainer.parentElement?.getBoundingClientRect();
		if (!parentRect) return;
		
		// Don't constrain if not zoomed
		if (scale <= 1) {
			posX = 0;
			posY = 0;
			return;
		}
		
		// Calculate max pan based on scaled image size
		const maxX = Math.max(0, (rect.width - parentRect.width) / 2);
		const maxY = Math.max(0, (rect.height - parentRect.height) / 2);
		
		// Constrain position
		posX = Math.max(-maxX, Math.min(maxX, posX));
		posY = Math.max(-maxY, Math.min(maxY, posY));
	}
	
	function handleWheel(e: WheelEvent) {
		if (!e.ctrlKey && !e.metaKey) return;
		
		e.preventDefault();
		
		const delta = -e.deltaY;
		const scaleChange = delta > 0 ? 1.2 : 0.8;
		
		scale = Math.max(1, Math.min(5, scale * scaleChange));
		constrainPosition();
		updateTransform();
	}
	
	function handleMouseDown(e: MouseEvent) {
		if (scale <= 1) return;
		
		isDragging = true;
		startX = e.clientX - posX;
		startY = e.clientY - posY;
		lastPosX = posX;
		lastPosY = posY;
	}
	
	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		
		posX = e.clientX - startX;
		posY = e.clientY - startY;
		constrainPosition();
		updateTransform();
	}
	
	function handleMouseUp() {
		isDragging = false;
	}
	
	function getDistance(touch1: Touch, touch2: Touch) {
		const dx = touch1.clientX - touch2.clientX;
		const dy = touch1.clientY - touch2.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}
	
	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 2) {
			// Pinch zoom start
			e.preventDefault();
			initialDistance = getDistance(e.touches[0], e.touches[1]);
			initialScale = scale;
		} else if (e.touches.length === 1 && scale > 1) {
			// Pan start when zoomed
			e.preventDefault();
			isDragging = true;
			startX = e.touches[0].clientX - posX;
			startY = e.touches[0].clientY - posY;
		}
	}
	
	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length === 2) {
			// Pinch zoom
			e.preventDefault();
			const currentDistance = getDistance(e.touches[0], e.touches[1]);
			const scaleChange = currentDistance / initialDistance;
			scale = Math.max(1, Math.min(5, initialScale * scaleChange));
			constrainPosition();
			updateTransform();
		} else if (e.touches.length === 1 && isDragging && scale > 1) {
			// Pan when zoomed
			e.preventDefault();
			posX = e.touches[0].clientX - startX;
			posY = e.touches[0].clientY - startY;
			constrainPosition();
			updateTransform();
		}
	}
	
	function handleTouchEnd(e: TouchEvent) {
		if (e.touches.length === 0) {
			isDragging = false;
			initialDistance = 0;
		}
	}
	
	function handleDoubleClick() {
		if (scale > 1) {
			resetZoom();
			updateTransform();
		} else {
			scale = 2.5;
			constrainPosition();
			updateTransform();
		}
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'PageDown') {
			e.preventDefault();
			nextPage();
		} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
			e.preventDefault();
			prevPage();
		} else if (e.key === 'Escape' && isFullscreen) {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		} else if (e.key === '0' || e.key === 'Home') {
			e.preventDefault();
			resetZoom();
			updateTransform();
		} else if (e.key === '+' || e.key === '=') {
			e.preventDefault();
			scale = Math.min(5, scale * 1.3);
			constrainPosition();
			updateTransform();
		} else if (e.key === '-' || e.key === '_') {
			e.preventDefault();
			scale = Math.max(1, scale / 1.3);
			constrainPosition();
			updateTransform();
		}
	}
	
	function handleImageLoad() {
		imageLoading = false;
	}
	
	function handleImageError() {
		imageLoading = false;
	}
	
	onMount(() => {
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('keydown', handleKeydown);
		
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head>
	<title>
		{manga ? `${manga.title} - Chapter - BakaWorld χ` : 'Manga Reader - BakaWorld χ'}
	</title>
</svelte:head>

<style>
	.manga-reader-container {
		min-height: 100vh;
		background: #0a0a0a;
	}

	.manga-viewer {
		background: #1a1a1a;
		border-radius: 0.5rem;
		position: relative;
		overflow: hidden;
	}

	.manga-viewer:fullscreen,
	.manga-viewer:-webkit-full-screen {
		background: #000;
		border-radius: 0;
		width: 100vw;
		height: 100vh;
	}

	.page-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
		padding: 2rem 1rem;
		position: relative;
		overflow: hidden;
		user-select: none;
	}

	.page-container.zoomed {
		cursor: grab;
		touch-action: none;
	}

	.page-container.dragging {
		cursor: grabbing;
	}

	.manga-viewer:fullscreen .page-container,
	.manga-viewer:-webkit-full-screen .page-container {
		min-height: 100vh;
		padding: 0;
	}

	.image-container {
		position: relative;
		transform-origin: center center;
		transition: transform 0.1s ease-out;
		will-change: transform;
		user-select: none;
	}
	
	.image-container.zoomed {
		cursor: grab;
	}
	
	.image-container.dragging {
		cursor: grabbing;
	}

	.manga-page {
		max-width: 100%;
		max-height: 70vh;
		width: auto;
		height: auto;
		display: block;
		user-select: none;
		pointer-events: none;
	}

	.manga-viewer:fullscreen .manga-page,
	.manga-viewer:-webkit-full-screen .manga-page {
		max-width: 100vw;
		max-height: 100vh;
	}

	.controls {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		gap: 0.5rem;
		z-index: 10;
	}

	.manga-viewer:fullscreen .controls,
	.manga-viewer:-webkit-full-screen .controls {
		position: fixed;
		z-index: 100;
	}
	
	@media (max-width: 640px) {
		.manga-viewer:fullscreen .controls,
		.manga-viewer:-webkit-full-screen .controls {
			top: 0.5rem;
			right: 0.5rem;
			gap: 0.25rem;
		}
	}

	.control-button {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.75rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.control-button:hover {
		background: rgba(0, 0, 0, 0.9);
		border-color: rgba(255, 255, 255, 0.5);
		transform: scale(1.05);
	}
	
	@media (max-width: 640px) {
		.manga-viewer:fullscreen .control-button,
		.manga-viewer:-webkit-full-screen .control-button {
			padding: 0.5rem;
		}
		
		.manga-viewer:fullscreen .control-button svg,
		.manga-viewer:-webkit-full-screen .control-button svg {
			width: 1.25rem;
			height: 1.25rem;
		}
	}

	.page-navigation {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 1rem;
		z-index: 10;
	}

	.manga-viewer:fullscreen .page-navigation,
	.manga-viewer:-webkit-full-screen .page-navigation {
		position: fixed;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.8);
		padding: 0.75rem 1.5rem;
		border-radius: 2rem;
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.2);
		margin-top: 0;
		z-index: 100;
		max-width: 90vw;
	}
	
	@media (max-width: 640px) {
		.manga-viewer:fullscreen .page-navigation,
		.manga-viewer:-webkit-full-screen .page-navigation {
			bottom: 0.5rem;
			padding: 0.5rem 1rem;
			gap: 0.5rem;
		}
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
		flex-shrink: 0;
	}

	.nav-button:hover:not(:disabled) {
		background: rgba(59, 130, 246, 1);
		transform: scale(1.05);
	}

	.nav-button:disabled {
		background: rgba(75, 85, 99, 0.5);
		border-color: rgba(75, 85, 99, 0.3);
		cursor: not-allowed;
		opacity: 0.5;
	}
	
	@media (max-width: 640px) {
		.manga-viewer:fullscreen .nav-button,
		.manga-viewer:-webkit-full-screen .nav-button {
			padding: 0.5rem 0.75rem;
			font-size: 0.875rem;
		}
	}

	.page-counter {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1.1rem;
		user-select: none;
		min-width: 6rem;
		text-align: center;
		white-space: nowrap;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	@media (max-width: 640px) {
		.manga-viewer:fullscreen .page-counter,
		.manga-viewer:-webkit-full-screen .page-counter {
			padding: 0.5rem 1rem;
			font-size: 1rem;
			min-width: 5rem;
		}
	}

	.zoom-indicator {
		position: absolute;
		top: 5rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		opacity: 0;
		transition: opacity 0.2s;
		pointer-events: none;
		z-index: 10;
	}

	.zoom-indicator.visible {
		opacity: 1;
	}

	.manga-viewer:fullscreen .zoom-indicator,
	.manga-viewer:-webkit-full-screen .zoom-indicator {
		position: fixed;
		z-index: 100;
	}
	
	@media (max-width: 640px) {
		.manga-viewer:fullscreen .zoom-indicator,
		.manga-viewer:-webkit-full-screen .zoom-indicator {
			top: 4rem;
			right: 0.5rem;
			padding: 0.4rem 0.8rem;
			font-size: 0.8rem;
		}
	}

	.arrow-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
	
	@media (max-width: 640px) {
		.manga-viewer:fullscreen .arrow-icon,
		.manga-viewer:-webkit-full-screen .arrow-icon {
			width: 1rem;
			height: 1rem;
		}
	}

	.loading-spinner {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 5;
	}

	.spinner {
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		border-top: 4px solid #3b82f6;
		width: 48px;
		height: 48px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.chapter-loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		backdrop-filter: blur(4px);
	}

	.chapter-spinner {
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		border-top: 4px solid #3b82f6;
		width: 64px;
		height: 64px;
		animation: spin 1s linear infinite;
	}

	.loading-text {
		color: white;
		font-size: 1.125rem;
		font-weight: 600;
	}
</style>

<!-- Chapter Navigation Loading Overlay -->
{#if isNavigating}
	<div class="chapter-loading-overlay">
		<div class="chapter-spinner"></div>
		<p class="loading-text">Loading chapter...</p>
	</div>
{/if}

<div class="manga-reader-container">
	<main class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Navigation Header -->
		<div class="bg-gray-900 rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
			<div>
				{#if manga}
					<a href="/manga/{cleanMangaId}" class="text-blue-400 hover:text-blue-300 text-sm mb-1 block">
						← Back to {mangaTitle}
					</a>
					<h1 class="text-white text-xl font-bold">{mangaTitle}</h1>
				{/if}
			</div>
			
			<div class="flex gap-4 items-center">
				{#if prevChapter && manga}
					<a 
						href="/manga/{cleanMangaId}/read/{cleanPrevChapterId}"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
					>
						← Previous Chapter
					</a>
				{/if}
				
				{#if nextChapter && manga}
					<a 
						href="/manga/{cleanMangaId}/read/{cleanNextChapterId}"
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
					>
						Next Chapter →
					</a>
				{/if}
			</div>
		</div>

		<!-- Manga Viewer -->
		{#if pages.length > 0}
			<div class="manga-viewer" bind:this={viewerContainer}>
				<!-- Controls -->
				<div class="controls">
					<button 
						class="control-button"
						on:click={() => { scale = Math.max(1, scale / 1.3); constrainPosition(); updateTransform(); }}
						title="Zoom Out (- key)"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
						</svg>
					</button>
					
					<button 
						class="control-button"
						on:click={() => { resetZoom(); updateTransform(); }}
						title="Reset Zoom (0 key)"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</button>
					
					<button 
						class="control-button"
						on:click={() => { scale = Math.min(5, scale * 1.3); constrainPosition(); updateTransform(); }}
						title="Zoom In (+ key)"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
						</svg>
					</button>
					
					<button 
						class="control-button"
						on:click={toggleFullscreen}
						title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F)'}
					>
						{#if isFullscreen}
							<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
							</svg>
						{/if}
					</button>
				</div>

				<!-- Zoom Indicator -->
				<div class="zoom-indicator" class:visible={scale > 1}>
					{Math.round(scale * 100)}%
				</div>

				<!-- Page Container -->
				<div 
					class="page-container"
					class:zoomed={scale > 1}
					class:dragging={isDragging}
					on:wheel={handleWheel}
					on:mousedown={handleMouseDown}
					on:mousemove={handleMouseMove}
					on:mouseup={handleMouseUp}
					on:mouseleave={handleMouseUp}
					on:touchstart={handleTouchStart}
					on:touchmove={handleTouchMove}
					on:touchend={handleTouchEnd}
					on:dblclick={handleDoubleClick}
					role="button"
					tabindex="0"
				>
					{#if imageLoading}
						<div class="loading-spinner">
							<div class="spinner"></div>
						</div>
					{/if}
					
					{#if pages[currentPage]}
						{#key currentPage}
							<div 
								class="image-container" 
								class:zoomed={scale > 1}
								class:dragging={isDragging}
								bind:this={imageContainer}
							>
								<img 
									src={`/api/proxy/image?url=${encodeURIComponent(pages[currentPage].image)}&referer=https://mangapill.com/`}
									alt="Page {currentPage + 1}"
									class="manga-page"
									on:load={handleImageLoad}
									on:error={handleImageError}
									style="opacity: {imageLoading ? 0 : 1}; transition: opacity 0.2s;"
								/>
							</div>
						{/key}
					{/if}
				</div>

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

			<!-- Chapter Navigation (Bottom) -->
			<div class="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6 bg-gray-900 rounded-lg p-4">
				{#if prevChapter && manga}
					<a 
						href="/manga/{cleanMangaId}/read/{cleanPrevChapterId}"
						class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
						</svg>
						Previous Chapter
					</a>
				{:else}
					<div class="bg-gray-800 text-gray-500 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 w-full sm:w-auto justify-center cursor-not-allowed opacity-50">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
						</svg>
						Previous Chapter
					</div>
				{/if}
				
				{#if nextChapter && manga}
					<a 
						href="/manga/{cleanMangaId}/read/{cleanNextChapterId}"
						class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
					>
						Next Chapter
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
						</svg>
					</a>
				{:else}
					<div class="bg-gray-800 text-gray-500 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 w-full sm:w-auto justify-center cursor-not-allowed opacity-50">
						Next Chapter
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
						</svg>
					</div>
				{/if}
			</div>
		{:else}
			<div class="bg-gray-900 rounded-lg p-8 text-center">
				<p class="text-gray-400 text-lg mb-2">No pages available for this chapter</p>
			</div>
		{/if}
	</main>
</div>
