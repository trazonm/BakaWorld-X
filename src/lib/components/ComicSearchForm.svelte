<!-- Comic Search Form Component -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let query: string = '';
	export let loading: boolean = false;

	const dispatch = createEventDispatcher<{ search: { query: string } }>();

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (query.trim()) {
			dispatch('search', { query: query.trim() });
		}
	}
</script>

<form class="flex justify-center" on:submit={handleSubmit}>
	<div class="flex w-full max-w-2xl">
		<input
			type="text"
			bind:value={query}
			placeholder="Search for comics..."
			class="flex-1 rounded-l-lg border border-gray-700 bg-gray-900 px-6 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-0"
			required
			disabled={loading}
		/>
		<button
			type="submit"
			class="rounded-r-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-600"
			disabled={loading || !query.trim()}
		>
			{#if loading}
				<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
				Searching...
			{:else}
				<svg class="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				Search
			{/if}
		</button>
	</div>
</form>

