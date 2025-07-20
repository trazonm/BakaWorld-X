<!-- Download Row Component -->
<script lang="ts">
	import { formatSpeed, formatSize } from '$lib/utils';
	import type { Download } from '$lib/types';

	export let download: Download;
	export let onDelete: (id: string) => void;
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
		<div class="flex items-center space-x-2">
			{#if download.link && download.progress >= 100}
				<a
					href={download.link}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
				>
					Download
				</a>
			{:else if download.progress >= 100}
				<span class="text-yellow-400 text-sm">Processing...</span>
			{:else}
				<span class="text-blue-400 text-sm">In Progress</span>
			{/if}
			
			<button
				on:click={() => onDelete(download.id)}
				class="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
				title="Delete download"
			>
				×
			</button>
		</div>
	</td>
</tr>
