<script lang="ts">
	import type { SearchResult } from '$lib/types';
	import { rowStatusStore } from '$lib/stores/ui';
	import { formatSize, getRowKey } from '$lib/utils';
	import TorrentActionButton from './TorrentActionButton.svelte';

	export let result: SearchResult;
	export let onAddToQueue: (result: SearchResult) => void;

	$: rowState = (() => {
		const store = $rowStatusStore;
		const primaryKey = getRowKey(result);
		if (store[primaryKey]) return store[primaryKey];
		if (result.id && result.Guid && store[result.Guid]) return store[result.Guid];
		const titleSizeKey = `${result.Title}-${result.Size}`;
		if (store[titleSizeKey]) return store[titleSizeKey];
		return undefined;
	})();

	$: usenet = result.protocol === 'usenet';
</script>

<article class="release">
	<div class="release__copy">
		<div class="release__tags">
			<span class:usenet>{usenet ? 'Usenet' : 'Torrent'}</span>
			{#if result.indexer}
				<span class="indexer">{result.indexer}</span>
			{/if}
		</div>
		<h3 title={result.Title}>{result.Title}</h3>
		<p>
			{formatSize(result.Size)}
			<span aria-hidden="true">·</span>
			{usenet ? 'Newznab' : `${result.Seeders || 0} seeders`}
		</p>
	</div>
	<TorrentActionButton {result} {rowState} {onAddToQueue} />
</article>

<style>
	.release {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 0.95rem;
		border-radius: 1rem;
		background: rgba(255, 246, 234, 0.03);
		border: 1px solid var(--theme-border);
	}
	.release__copy {
		min-width: 0;
	}
	.release__tags {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.35rem;
	}
	.release__tags span {
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.12rem 0.4rem;
		border-radius: 999px;
		color: #1a0906;
		background: var(--theme-accent);
	}
	.release__tags span.usenet,
	.release__tags span.indexer {
		color: var(--theme-text-secondary);
		background: transparent;
		border: 1px solid var(--theme-border);
	}
	h3 {
		margin: 0;
		font-size: 0.98rem;
		font-weight: 640;
		color: var(--theme-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: min(36rem, 62vw);
	}
	p {
		margin: 0.25rem 0 0;
		color: var(--theme-text-secondary);
		font-size: 0.8rem;
	}
	@media (max-width: 720px) {
		.release {
			flex-direction: column;
			align-items: stretch;
		}
		h3 {
			white-space: normal;
			max-width: none;
		}
	}
</style>
