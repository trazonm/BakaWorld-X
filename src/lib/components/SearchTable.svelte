<script lang="ts">
	import TorrentRow from './TorrentRow.svelte';
	import type { SearchResult, SortKey, SortDirection } from '$lib/types';
	import { eachSearchResultKey } from '$lib/utils';

	export let results: SearchResult[];
	export let sortKey: SortKey;
	export let sortDirection: SortDirection;
	export let onSort: (key: SortKey) => void;
	export let onAddToQueue: (result: SearchResult) => void;

	const sorts: { key: SortKey; label: string }[] = [
		{ key: 'Seeders', label: 'Seeders' },
		{ key: 'Size', label: 'Size' },
		{ key: 'Title', label: 'Title' }
	];
</script>

<div class="stack-sort">
	{#each sorts as sort}
		<button type="button" class:active={sortKey === sort.key} on:click={() => onSort(sort.key)}>
			{sort.label}
			{#if sortKey === sort.key}
				{sortDirection === 'asc' ? '↑' : '↓'}
			{/if}
		</button>
	{/each}
</div>

<div class="stack-list">
	{#each results as result, i (eachSearchResultKey(result, i))}
		<TorrentRow {result} {onAddToQueue} />
	{/each}
</div>

<style>
	.stack-sort {
		display: flex;
		gap: 0.4rem;
		padding: 0.75rem 0.75rem 0;
	}
	.stack-sort button {
		border: 1px solid var(--theme-border);
		background: transparent;
		color: var(--theme-text-secondary);
		border-radius: 999px;
		padding: 0.3rem 0.7rem;
		font-size: 0.75rem;
		cursor: pointer;
	}
	.stack-sort button.active {
		color: #1a0906;
		background: var(--theme-accent);
		border-color: transparent;
	}
	.stack-list {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 0.75rem;
	}
</style>
