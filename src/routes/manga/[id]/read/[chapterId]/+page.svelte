<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	
	export let data: PageData;
	$: chapter = data.chapter;
	$: manga = data.manga;
	$: nextChapter = data.nextChapter;
	$: prevChapter = data.prevChapter;
	$: pages = chapter?.pages || [];
	$: mangaTitle = manga?.title || 'Manga';
	
	let viewerContainer: HTMLDivElement;
	let isFullscreen = false;
	let imageStates = new Map<number, { scale: number; posX: number; posY: number }>();
	let activeImageIndex: number | null = null;
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	
	// Reset all zoom states when chapter changes
	$: if (chapter) {
		imageStates.clear();
		imageStates = new Map();
	}
	let initialDistance = 0;
	let initialScale = 1;
	
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
	
	function getImageState(index: number) {
		if (!imageStates.has(index)) {
			imageStates.set(index, { scale: 1, posX: 0, posY: 0 });
		}
		return imageStates.get(index)!;
	}
	
	function updateTransform(index: number, container: HTMLElement) {
		const state = getImageState(index);
		container.style.transform = `translate(${state.posX}px, ${state.posY}px) scale(${state.scale})`;
	}
	
	function constrainPosition(index: number, container: HTMLElement) {
		const state = getImageState(index);
		
		if (state.scale <= 1) {
			state.posX = 0;
			state.posY = 0;
			return;
		}
		
		const rect = container.getBoundingClientRect();
		const parentRect = container.parentElement?.getBoundingClientRect();
		if (!parentRect) return;
		
		const maxX = Math.max(0, (rect.width - parentRect.width) / 2);
		const maxY = Math.max(0, (rect.height - parentRect.height) / 2);
		
		state.posX = Math.max(-maxX, Math.min(maxX, state.posX));
		state.posY = Math.max(-maxY, Math.min(maxY, state.posY));
	}
	
	function handleWheel(e: WheelEvent, index: number, container: HTMLElement) {
		if (!e.ctrlKey && !e.metaKey) return;
		
		e.preventDefault();
		const state = getImageState(index);
		const delta = -e.deltaY;
		const scaleChange = delta > 0 ? 1.2 : 0.8;
		
		state.scale = Math.max(1, Math.min(5, state.scale * scaleChange));
		constrainPosition(index, container);
		updateTransform(index, container);
	}
	
	function handleMouseDown(e: MouseEvent, index: number) {
		const state = getImageState(index);
		if (state.scale <= 1) return;
		
		isDragging = true;
		activeImageIndex = index;
		startX = e.clientX - state.posX;
		startY = e.clientY - state.posY;
	}
	
	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || activeImageIndex === null) return;
		
		const state = getImageState(activeImageIndex);
		const container = document.querySelector(`[data-image-index="${activeImageIndex}"]`) as HTMLElement;
		if (!container) return;
		
		state.posX = e.clientX - startX;
		state.posY = e.clientY - startY;
		constrainPosition(activeImageIndex, container);
		updateTransform(activeImageIndex, container);
	}
	
	function handleMouseUp() {
		isDragging = false;
		activeImageIndex = null;
	}
	
	function getDistance(touch1: Touch, touch2: Touch) {
		const dx = touch1.clientX - touch2.clientX;
		const dy = touch1.clientY - touch2.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}
	
	function handleTouchStart(e: TouchEvent, index: number) {
		const state = getImageState(index);
		
		if (e.touches.length === 2) {
			// Pinch zoom start
			e.preventDefault();
			activeImageIndex = index;
			initialDistance = getDistance(e.touches[0], e.touches[1]);
			initialScale = state.scale;
		} else if (e.touches.length === 1 && state.scale > 1) {
			// Pan start when zoomed
			e.preventDefault();
			isDragging = true;
			activeImageIndex = index;
			startX = e.touches[0].clientX - state.posX;
			startY = e.touches[0].clientY - state.posY;
		}
	}
	
	function handleTouchMove(e: TouchEvent) {
		if (activeImageIndex === null) return;
		
		const state = getImageState(activeImageIndex);
		const container = document.querySelector(`[data-image-index="${activeImageIndex}"]`) as HTMLElement;
		if (!container) return;
		
		if (e.touches.length === 2) {
			// Pinch zoom
			e.preventDefault();
			const currentDistance = getDistance(e.touches[0], e.touches[1]);
			const scaleChange = currentDistance / initialDistance;
			state.scale = Math.max(1, Math.min(5, initialScale * scaleChange));
			constrainPosition(activeImageIndex, container);
			updateTransform(activeImageIndex, container);
		} else if (e.touches.length === 1 && isDragging && state.scale > 1) {
			// Pan when zoomed
			e.preventDefault();
			state.posX = e.touches[0].clientX - startX;
			state.posY = e.touches[0].clientY - startY;
			constrainPosition(activeImageIndex, container);
			updateTransform(activeImageIndex, container);
		}
	}
	
	function handleTouchEnd(e: TouchEvent) {
		if (e.touches.length === 0) {
			isDragging = false;
			activeImageIndex = null;
			initialDistance = 0;
		}
	}
	
	function handleDoubleClick(index: number, container: HTMLElement) {
		const state = getImageState(index);
		
		if (state.scale > 1) {
			state.scale = 1;
			state.posX = 0;
			state.posY = 0;
		} else {
			state.scale = 2.5;
		}
		
		constrainPosition(index, container);
		updateTransform(index, container);
	}
	
	onMount(() => {
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	});
</script>

<svelte:head>
	<title>
		{manga ? `${manga.title} - Chapter - BakaWorld χ` : 'Manga Reader - BakaWorld χ'}
	</title>
</svelte:head>

<style>
	:global(html), :global(body) {
		overflow-y: auto !important;
		height: auto !important;
	}

	.manga-reader-container {
		min-height: 100vh;
		background: var(--theme-bg-primary, #0f172a);
	}

	.manga-viewer {
		background: var(--theme-bg-secondary, #1e293b);
		border-radius: 0.5rem;
		position: relative;
	}

	.manga-viewer:fullscreen,
	.manga-viewer:-webkit-full-screen {
		background: var(--theme-bg-primary, #0f172a);
		border-radius: 0;
		height: 100vh;
		overflow-y: auto;
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

	.page-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
	}

	.manga-viewer:fullscreen .page-container,
	.manga-viewer:-webkit-full-screen .page-container {
		padding: 1rem 0;
	}

	.image-wrapper {
		width: 100%;
		display: flex;
		justify-content: center;
		overflow: hidden;
		position: relative;
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
		touch-action: none;
	}

	.image-container.dragging {
		cursor: grabbing;
	}

	.manga-page {
		max-width: 100%;
		width: auto;
		height: auto;
		display: block;
		user-select: none;
		pointer-events: none;
	}
</style>

<div class="manga-reader-container">
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

		<!-- Manga Viewer -->
		{#if pages.length > 0}
			<div class="manga-viewer" bind:this={viewerContainer}>
				<!-- Controls -->
				<div class="controls">
					<button 
						class="control-button"
						on:click={toggleFullscreen}
						title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
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

				<!-- Pages Container -->
				<div class="page-container">
					{#each pages as page, index}
						<div class="image-wrapper">
							<div 
								class="image-container"
								class:zoomed={getImageState(index).scale > 1}
								class:dragging={isDragging && activeImageIndex === index}
								data-image-index={index}
								on:wheel={(e) => {
									const container = e.currentTarget as HTMLElement;
									handleWheel(e, index, container);
								}}
								on:mousedown={(e) => handleMouseDown(e, index)}
								on:touchstart={(e) => handleTouchStart(e, index)}
								on:touchmove={handleTouchMove}
								on:touchend={handleTouchEnd}
								on:dblclick={() => {
									const container = document.querySelector(`[data-image-index="${index}"]`) as HTMLElement;
									if (container) handleDoubleClick(index, container);
								}}
							>
								<img 
									src={page.img} 
									alt="Page {page.page || index + 1}"
									class="manga-page"
									loading="lazy"
								/>
							</div>
						</div>
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
