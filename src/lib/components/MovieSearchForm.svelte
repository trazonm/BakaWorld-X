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
			placeholder="Search movies and TV…"
			class="flex-1 rounded-l-lg border border-gray-700 bg-gray-900 px-6 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-0"
			required
			disabled={loading}
		/>
		<button
			type="submit"
			class="rounded-r-lg border border-amber-600 bg-amber-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={loading || !query.trim()}
		>
			{#if loading}
				<span class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
				Searching…
			{:else}
				<svg class="mr-2 inline-block h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				Search
			{/if}
		</button>
	</div>
</form>
