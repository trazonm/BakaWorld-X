<!-- Search results table component -->
<script lang="ts">
	import TorrentRow from './TorrentRow.svelte';
	import type { SearchResult, SortKey, SortDirection } from '$lib/types';
	import { getRowKey } from '$lib/utils';

	export let results: SearchResult[];
	export let sortKey: SortKey;
	export let sortDirection: SortDirection;
	export let onSort: (key: SortKey) => void;
	export let onAddToQueue: (result: SearchResult) => void;
</script>

<div class="overflow-x-auto">
	<table class="min-w-full text-left text-sm bg-gray-900 text-white border border-gray-800">
		<thead>
			<tr class="border-b border-gray-800">
				<th
					class="cursor-pointer px-4 py-2 select-none"
					on:click={() => onSort('Title')}
				>
					Name
					{#if sortKey === 'Title'}
						<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
					{/if}
				</th>
				<th
					class="cursor-pointer px-4 py-2 select-none"
					on:click={() => onSort('Size')}
				>
					Size
					{#if sortKey === 'Size'}
						<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
					{/if}
				</th>
				<th
					class="cursor-pointer px-4 py-2 select-none"
					on:click={() => onSort('Seeders')}
				>
					Seeders
					{#if sortKey === 'Seeders'}
						<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
					{/if}
				</th>
				<th class="px-4 py-2">Action</th>
			</tr>
		</thead>
		<tbody>
			{#each results as result, index (`${getRowKey(result)}-${index}`)}
				<TorrentRow {result} {onAddToQueue} />
			{/each}
		</tbody>
	</table>
</div>
