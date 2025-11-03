<!-- Download Card Component for Mobile -->
<script lang="ts">
	import { formatSpeed, formatSize } from '$lib/utils';
	import type { Download } from '$lib/types';
	import { createEventDispatcher } from 'svelte';

	export let download: Download;
	export let onDelete: (id: string) => void;

	const dispatch = createEventDispatcher();

	async function copyToClipboard() {
		if (!download.link) return;
		
		try {
			await navigator.clipboard.writeText(download.link);
			dispatch('toast', { message: 'Copied to clipboard' });
		} catch (err) {
			console.error('Failed to copy:', err);
			dispatch('toast', { message: 'Failed to copy link' });
		}
	}
</script>

<div class="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-3">
	<!-- Header -->
	<div class="mb-3">
		<h3 class="text-white font-medium truncate text-sm mb-2" title={download.filename}>
			{download.filename}
		</h3>
	</div>
	
	<!-- Progress Bar -->
	<div class="mb-3">
		<div class="flex justify-between items-center mb-1">
			<span class="text-xs text-gray-300">{download.progress}%</span>
			<span class="text-xs text-gray-400">{download.status || '—'}</span>
		</div>
		<div class="w-full bg-gray-700 rounded-full h-2">
			<div 
				class="bg-blue-600 h-2 rounded-full transition-all duration-300"
				style="width: {download.progress}%"
			></div>
		</div>
	</div>
	
	<!-- Metadata Grid -->
	<div class="grid grid-cols-2 gap-2 mb-3 text-xs">
		<div>
			<span class="text-gray-400">Seeders:</span>
			<span class="text-gray-300 ml-1">{download.seeders || '—'}</span>
		</div>
		<div>
			<span class="text-gray-400">Speed:</span>
			<span class="text-gray-300 ml-1">{formatSpeed(download.speed)}</span>
		</div>
	</div>
	
	<!-- Actions -->
	<div class="flex items-center justify-between gap-2 relative">
		{#if download.link && download.progress >= 100}
			<a
				href={download.link}
				target="_blank"
				rel="noopener noreferrer"
				class="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors touch-manipulation"
			>
				Download
			</a>
			<button
				on:click={copyToClipboard}
				class="download-delete-button inline-flex items-center justify-center rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors touch-manipulation leading-none"
				title="Copy download link"
				aria-label="Copy download link"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
			</button>
		{:else if download.progress >= 100}
			<span class="flex-1 text-center text-yellow-400 text-sm py-2">Processing...</span>
		{:else}
			<span class="flex-1 text-center text-blue-400 text-sm py-2">In Progress</span>
		{/if}
		
		<button
			on:click={() => onDelete(download.id)}
			class="download-delete-button inline-flex items-center justify-center rounded text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors touch-manipulation leading-none"
			title="Delete download"
			aria-label="Delete download"
		>
			×
		</button>
	</div>
</div>

<style>
	.touch-manipulation {
		touch-action: manipulation;
	}
</style>

