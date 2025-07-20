<!-- Search results modal component -->
<script lang="ts">
	import type { SearchResult } from '$lib/types';
	import { showResultsStore } from '$lib/stores/ui';
	import SearchTable from './SearchTable.svelte';

	export let results: SearchResult[] = [];
	export let loading = false;
	export let error = '';
	export let modalSearch = '';
	export let sortKey: 'Title' | 'Size' | 'Seeders' = 'Seeders';
	export let sortDirection: 'asc' | 'desc' = 'desc';
	export let onSort: (key: 'Title' | 'Size' | 'Seeders') => void;
	export let onAddToQueue: (result: SearchResult) => void;

	$: filteredResults = results.filter(
		(r) => r.Title && r.Title.toLowerCase().includes(modalSearch.trim().toLowerCase())
	);
</script>

{#if $showResultsStore}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div
			class="relative flex h-[32rem] max-h-full w-[80vw] flex-col rounded-lg bg-gray-900 p-8 shadow-2xl border border-gray-800"
		>
			<button
				class="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-200"
				on:click={() => showResultsStore.set(false)}>&times;</button
			>
			<h2 class="mb-4 text-2xl font-bold text-white">Search Results</h2>
			<input
				type="text"
				placeholder="Filter by name..."
				class="mb-4 w-full rounded border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
				bind:value={modalSearch}
			/>
			<div class="flex-1 overflow-y-auto">
				{#if loading}
					<div
						class="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-400"
					>
						<svg
							class="mb-2 h-8 w-8 animate-spin text-blue-600"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 008-8v4a4 4 0 00-4 4H4z"
							></path>
						</svg>
						Loading...
					</div>
				{:else if error}
					<div class="text-center text-red-400">{error}</div>
				{:else if filteredResults.length === 0}
					<div class="text-center text-gray-400">No results found.</div>
				{:else}
					<SearchTable 
						results={filteredResults} 
						{sortKey} 
						{sortDirection} 
						{onSort} 
						{onAddToQueue} 
					/>
				{/if}
			</div>
		</div>
	</div>
{/if}
