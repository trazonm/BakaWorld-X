<!-- Search results modal component -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { SearchResult } from '$lib/types';
	import { showResultsStore } from '$lib/stores/ui';
	import SearchTable from './SearchTable.svelte';

	export let results: SearchResult[] = [];
	export let loading = false;
	export let error = '';
	export let note = '';
	export let modalSearch = '';
	export let sortKey: 'Title' | 'Size' | 'Seeders' = 'Seeders';
	export let sortDirection: 'asc' | 'desc' = 'desc';
	export let onSort: (key: 'Title' | 'Size' | 'Seeders') => void;
	export let onAddToQueue: (result: SearchResult) => void;

	const INITIAL_VISIBLE = 72;
	const LOAD_MORE = 72;

	let visibleCount = INITIAL_VISIBLE;
	let resultsListRef: SearchResult[] | null = null;

	$: if (results !== resultsListRef) {
		resultsListRef = results;
		visibleCount = INITIAL_VISIBLE;
	}

	$: totalResults = results.length;
	$: windowedResults =
		totalResults <= visibleCount ? results : results.slice(0, visibleCount);

	// Local input value - completely independent, no reactive syncing
	// This prevents any interference while typing
	let inputValue = modalSearch;
	
	// Debounce timer
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	const DEBOUNCE_DELAY = 300;

	// Update modalSearch when inputValue changes (debounced)
	function handleInput() {
		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		
		// Set new timer to update modalSearch after user stops typing
		debounceTimer = setTimeout(() => {
			modalSearch = inputValue;
			debounceTimer = null;
		}, DEBOUNCE_DELAY);
	}

	// Reset input only when modal first opens (not while typing)
	// Use a simple reactive statement that only runs when modal opens
	let wasModalOpen = false;
	$: {
		const isModalOpen = $showResultsStore;
		// Only sync when modal transitions from closed to open AND we're not typing
		// Check debounceTimer to ensure we're not in the middle of typing
		if (isModalOpen && !wasModalOpen && !debounceTimer) {
			inputValue = modalSearch;
		}
		wasModalOpen = isModalOpen;
	}

	// Clean up timer on destroy
	onDestroy(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
	});

</script>

{#if $showResultsStore}
	<div
		class="search-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 md:items-center md:p-6"
	>
		<div
			class="relative flex h-[92vh] max-h-full w-full max-w-5xl flex-col rounded-t-3xl border border-[var(--theme-border)] bg-[#160c12]/95 p-4 shadow-2xl shadow-black/50 md:h-[min(44rem,90vh)] md:rounded-3xl md:p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="search-modal-title"
		>
			<button
				class="absolute top-2 right-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-2xl text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-100 md:text-3xl"
				on:click={() => showResultsStore.set(false)}
				aria-label="Close modal"
			>&times;</button
			>
			<div class="mb-3 flex flex-col gap-1 pr-10 md:mb-4">
				<h2 id="search-modal-title" class="text-xl font-bold tracking-tight text-[var(--theme-text-primary)] md:text-2xl">
					From the stacks
				</h2>
				{#if note}
					<p class="text-xs text-amber-200/80">{note}</p>
				{/if}
				{#if !error && results.length > 0}
					<p class="text-xs text-zinc-500 md:text-sm">
						Showing {windowedResults.length} of {totalResults}
						{#if totalResults > windowedResults.length}
							— load more for the rest
						{/if}
					</p>
				{/if}
			</div>
			<input
				type="text"
				placeholder="Filter by name..."
				class="mb-3 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-zinc-50 placeholder:text-zinc-500 transition focus:border-white/20 focus:outline-none focus:ring-0 md:mb-4"
				bind:value={inputValue}
				on:input={handleInput}
			/>
			<div class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950/40">
				{#if loading && results.length === 0}
					<div
						class="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-center text-zinc-400"
					>
						<div
							class="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-transparent border-t-[var(--theme-accent)] border-r-zinc-600"
						></div>
						Loading…
					</div>
				{:else if error}
					<div class="p-6 text-center text-red-400">{error}</div>
				{:else if results.length === 0}
					<div class="p-6 text-center text-zinc-400">No results found.</div>
				{:else}
					<SearchTable results={windowedResults} {sortKey} {sortDirection} {onSort} {onAddToQueue} />
					{#if totalResults > visibleCount}
						<div class="sticky bottom-0 border-t border-white/10 bg-zinc-950/95 p-3">
							<button
								type="button"
								class="w-full rounded-xl border border-white/10 bg-zinc-900/60 py-2.5 text-sm font-semibold text-theme-accent transition-colors hover:border-white/15 hover:bg-zinc-800/90"
								on:click={() =>
									(visibleCount = Math.min(visibleCount + LOAD_MORE, totalResults))}
							>
								Load more ({totalResults - visibleCount} remaining)
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
