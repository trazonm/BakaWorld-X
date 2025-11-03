<!-- Download Row Component -->
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

<tr class="border-b border-gray-700 hover:bg-gray-800/50">
	<td class="px-4 py-3 text-gray-200">
		<div class="font-medium truncate max-w-xs" title={download.filename}>
			{download.filename}
		</div>
	</td>
	<td class="px-4 py-3">
		<div class="flex items-center space-x-3">
			<div class="flex-1">
				<div class="flex justify-between items-center mb-1">
					<span class="text-sm text-gray-300">{download.progress}%</span>
				</div>
				<div class="w-full bg-gray-700 rounded-full h-2">
					<div 
						class="bg-blue-600 h-2 rounded-full transition-all duration-300"
						style="width: {download.progress}%"
					></div>
				</div>
			</div>
		</div>
	</td>
	<td class="px-4 py-3 text-gray-300">
		{#if download.link && download.progress >= 100}
			Downloaded
		{:else}
			{download.status || '—'}
		{/if}
	</td>
	<td class="px-4 py-3 text-gray-300">
		{download.seeders || '—'}
	</td>
	<td class="px-4 py-3 text-gray-300">
		{formatSpeed(download.speed)}
	</td>
	<td class="px-4 py-3">
		<div class="flex items-center space-x-2 relative">
			{#if download.link && download.progress >= 100}
				<a
					href={download.link}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
				>
					Download
				</a>
				<button
					on:click={copyToClipboard}
					class="download-delete-button inline-flex items-center justify-center rounded text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors leading-none"
					title="Copy download link"
					aria-label="Copy download link"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
				</button>
			{:else if download.progress >= 100}
				<span class="text-yellow-400 text-sm">Processing...</span>
			{:else}
				<span class="text-blue-400 text-sm">In Progress</span>
			{/if}
			
			<button
				on:click={() => onDelete(download.id)}
				class="download-delete-button inline-flex items-center justify-center rounded text-[10px] font-bold bg-red-600 text-white hover:bg-red-700 transition-colors leading-none"
				title="Delete download"
				aria-label="Delete download"
			>
				×
			</button>
		</div>
	</td>
</tr>
