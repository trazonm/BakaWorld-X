<!-- Downloads Table Component -->
<script lang="ts">
	import DownloadRow from './DownloadRow.svelte';
	import type { Download } from '$lib/types';

	export let downloads: Download[];
	export let loading: boolean;
	export let error: string;
	export let onDelete: (id: string) => void;
</script>

<div class="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
	<div class="px-6 py-4 border-b border-gray-800">
		<h2 class="text-xl font-semibold text-white">Downloads</h2>
		<p class="text-gray-400 text-sm mt-1">
			{downloads.length} active download{downloads.length !== 1 ? 's' : ''}
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="flex items-center space-x-3 text-gray-400">
				<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
				</svg>
				<span>Loading downloads...</span>
			</div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center py-12">
			<div class="text-red-400 text-center">
				<p class="font-medium">Error loading downloads</p>
				<p class="text-sm mt-1">{error}</p>
			</div>
		</div>
	{:else if downloads.length === 0}
		<div class="flex items-center justify-center py-12">
			<div class="text-gray-400 text-center">
				<p class="text-lg font-medium">No downloads yet</p>
				<p class="text-sm mt-1">Start searching for torrents to see your downloads here</p>
			</div>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full">
				<thead class="bg-gray-800/50">
					<tr class="border-b border-gray-700">
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
							Filename
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
							Progress
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
							Status
						</th>						
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
							Seeders
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
							Speed
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
							Action
						</th>
					</tr>
				</thead>
				<tbody class="bg-gray-900">
					{#each downloads as download (download.id)}
						<DownloadRow {download} {onDelete} />
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
