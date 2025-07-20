<!-- Action button component for torrent rows -->
<script lang="ts">
	import type { SearchResult, RowStatus, Download } from '$lib/types';
	import { torrentService } from '$lib/services/torrentService';

	export let result: SearchResult;
	export let rowState: RowStatus | undefined;
	export let onAddToQueue: (result: SearchResult) => void;

	async function getTorrentInfo(id: string): Promise<{ progress?: number; [key: string]: any }> {
		try {
			return await torrentService.getTorrentInfo(id);
		} catch (e) {
			console.error('Failed to get torrent info for', id);
			return {};
		}
	}

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
	<button
		class="rounded bg-blue-700 px-3 py-1 font-semibold text-white hover:bg-blue-800"
		on:click={() => onAddToQueue(result)}>Add to Queue</button
	>
{:else if rowState.state === 'adding'}
	<span class="animate-pulse text-blue-400">Processing</span>
{:else if rowState.state === 'progress'}
	{#if result.id}
		{#await getTorrentInfo(result.id)}
			<span class="animate-pulse text-blue-400">Uploading</span>
		{:then torrentInfo}
			<span class="animate-pulse text-blue-400">Progress: {torrentInfo.progress || 0}%</span>
		{/await}
	{:else}
		<span class="animate-pulse text-blue-400">Uploading</span>
	{/if}
{:else if rowState.state === 'done'}
	{#if result.id}
		{#await getDownloadLink(result.id)}
			<button
				class="rounded bg-green-700 px-3 py-1 font-semibold text-white hover:bg-green-800"
				disabled>Download Link</button>
		{:then downloadLink}
			{#if downloadLink}
				<button
					class="rounded bg-green-700 px-3 py-1 font-semibold text-white hover:bg-green-800"
					on:click={() => window.open(downloadLink, '_blank', 'noopener')}
				>
					Download Link
				</button>
			{:else}
				<button
					class="rounded bg-green-700 px-3 py-1 font-semibold text-white hover:bg-green-800"
					disabled>Download Link</button>
				{/if}
			{:catch}
				<button
					class="rounded bg-green-700 px-3 py-1 font-semibold text-white hover:bg-green-800"
					disabled>Download Link</button>
			{/await}
	{:else}
		<button
			class="rounded bg-green-700 px-3 py-1 font-semibold text-white hover:bg-green-800"
			disabled>Download Link</button
		>
	{/if}
{:else if rowState.state === 'error'}
	<span class="text-red-400">Error</span>
{/if}
