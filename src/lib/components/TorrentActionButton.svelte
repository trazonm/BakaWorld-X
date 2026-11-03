<script lang="ts">
	import type { SearchResult, RowStatus, Download } from '$lib/types';
	import { torrentService } from '$lib/services/torrentService';

	export let result: SearchResult;
	export let rowState: RowStatus | undefined;
	export let onAddToQueue: (result: SearchResult) => void;

	$: progress = typeof rowState?.progress === 'number' ? Math.round(rowState.progress) : 0;
	$: usenet = result.protocol === 'usenet' || rowState?.protocol === 'usenet';

	async function getDownloadLink(id: string) {
		try {
			const downloads = await torrentService.getDownloads();
			const download = downloads.find((d: Download) => d.id === id);
			return download?.link ? await torrentService.unrestrictLink(download.link) : undefined;
		} catch (e) {
			console.error('Failed to get download info');
			return undefined;
		}
	}
</script>

{#if !rowState || rowState.state === 'idle'}
	<button class="queue" type="button" on:click={() => onAddToQueue(result)}>
		{usenet ? 'Send to Usenet' : 'Add to queue'}
	</button>
{:else if rowState.state === 'adding'}
	<span class="status">Sending…</span>
{:else if rowState.state === 'progress'}
	<div class="meter" aria-label="Download progress {progress}%">
		<div class="meter__bar" style="width: {progress}%"></div>
		<span>{progress}%</span>
	</div>
{:else if rowState.state === 'done'}
	{#if usenet}
		<span class="sent">In your usenet queue</span>
	{:else if result.id}
		{#await getDownloadLink(result.id)}
			<button class="ready" type="button" disabled>Opening link…</button>
		{:then downloadLink}
			{#if downloadLink}
				<button class="ready" type="button" on:click={() => window.open(downloadLink, '_blank', 'noopener')}>
					Download
				</button>
			{:else}
				<button class="ready" type="button" disabled>Finishing…</button>
			{/if}
		{:catch}
			<button class="ready" type="button" disabled>Link unavailable</button>
		{/await}
	{:else}
		<button class="ready" type="button" disabled>Finishing…</button>
	{/if}
{:else if rowState.state === 'error'}
	<div class="error">
		<span>{rowState.error?.toLowerCase().includes('invalid torrent') ? 'Invalid torrent' : 'Could not queue'}</span>
		{#if rowState.error}
			<small title={rowState.error}>{rowState.error.slice(0, 80)}</small>
		{/if}
	</div>
{/if}

<style>
	.queue,
	.ready {
		border: 0;
		border-radius: 999px;
		min-height: 2.6rem;
		padding: 0 0.95rem;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
	}
	.queue {
		background: var(--theme-text-primary);
		color: #1a0906;
	}
	.ready {
		background: var(--theme-matcha, #c6f26d);
		color: #142006;
	}
	.ready:disabled,
	.queue:disabled {
		opacity: 0.6;
		cursor: progress;
	}
	.status,
	.sent {
		color: var(--theme-accent);
		font-size: 0.85rem;
		font-weight: 650;
	}
	.meter {
		position: relative;
		min-width: 7.5rem;
		height: 2.2rem;
		border-radius: 999px;
		overflow: hidden;
		background: rgba(255, 246, 234, 0.06);
		border: 1px solid var(--theme-border);
	}
	.meter__bar {
		position: absolute;
		inset: 0 auto 0 0;
		background: linear-gradient(90deg, #ff5a36, #ffb057);
	}
	.meter span {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		height: 100%;
		font-size: 0.8rem;
		font-weight: 750;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
	}
	.error {
		display: flex;
		flex-direction: column;
		color: #ffb4a8;
		font-size: 0.82rem;
		max-width: 12rem;
	}
	.error small {
		opacity: 0.8;
	}
</style>
