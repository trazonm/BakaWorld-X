<!-- Individual torrent row component -->
<script lang="ts">
	import type { SearchResult } from '$lib/types';
	import { rowStatusStore } from '$lib/stores/ui';
	import { formatSize, getRowKey } from '$lib/utils';
	import TorrentActionButton from './TorrentActionButton.svelte';

	export let result: SearchResult;
	export let onAddToQueue: (result: SearchResult) => void;

	// Look up row state by trying multiple possible keys
	$: rowState = (() => {
		const store = $rowStatusStore;
		const primaryKey = getRowKey(result);
		
		// First try the primary key (id, then Guid, then Title-Size)
		if (store[primaryKey]) {
			return store[primaryKey];
		}
		
		// If result has an id, try the Guid as a fallback
		if (result.id && result.Guid && store[result.Guid]) {
			return store[result.Guid];
		}
		
		// Try Title-Size combination as another fallback
		const titleSizeKey = `${result.Title}-${result.Size}`;
		if (store[titleSizeKey]) {
			return store[titleSizeKey];
		}
		
		return undefined;
	})();
</script>

<tr class="border-b border-gray-800 hover:bg-gray-800">
	<td class="px-4 py-2">{result.Title}</td>
	<td class="px-4 py-2">{formatSize(result.Size)}</td>
	<td class="px-4 py-2">{result.Seeders}</td>
	<td class="px-4 py-2">
		<TorrentActionButton 
			{result} 
			{rowState}
			{onAddToQueue} 
		/>
	</td>
</tr>
