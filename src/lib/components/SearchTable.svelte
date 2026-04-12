<!-- Search results table component -->
<script lang="ts">
	import TorrentRow from './TorrentRow.svelte';
	import type { SearchResult, SortKey, SortDirection } from '$lib/types';
	import { eachSearchResultKey } from '$lib/utils';

	export let results: SearchResult[];
	export let sortKey: SortKey;
	export let sortDirection: SortDirection;
	export let onSort: (key: SortKey) => void;
	export let onAddToQueue: (result: SearchResult) => void;
</script>

<div class="overflow-x-auto">
	<table class="min-w-full border-collapse text-left text-sm text-zinc-100">
		<thead class="sticky top-0 z-[1] border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
			<tr>
				<th
					class="cursor-pointer px-4 py-3 select-none text-zinc-400 transition-colors hover:text-fuchsia-200"
					on:click={() => onSort('Title')}
				>
					Name
					{#if sortKey === 'Title'}
						<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
					{/if}
				</th>
				<th
					class="cursor-pointer px-4 py-3 select-none text-zinc-400 transition-colors hover:text-fuchsia-200"
					on:click={() => onSort('Size')}
				>
					Size
					{#if sortKey === 'Size'}
						<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
					{/if}
				</th>
				<th
					class="cursor-pointer px-4 py-3 select-none text-zinc-400 transition-colors hover:text-fuchsia-200"
					on:click={() => onSort('Seeders')}
				>
					Seeders
					{#if sortKey === 'Seeders'}
						<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
					{/if}
				</th>
				<th class="px-4 py-3">Action</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-zinc-800/90">
			{#each results as result, i (eachSearchResultKey(result, i))}
				<TorrentRow {result} {onAddToQueue} />
			{/each}
		</tbody>
	</table>
</div>
