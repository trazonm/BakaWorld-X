<!-- Pagination Component -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let currentPage: number;
	export let totalPages: number;
	export let hasNextPage: boolean;
	export let loading: boolean = false;

	const dispatch = createEventDispatcher<{
		'page-change': { page: number };
		'next': void;
		'prev': void;
	}>();

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages && !loading) {
			dispatch('page-change', { page });
		}
	}

	function nextPage() {
		if (hasNextPage && currentPage < totalPages && !loading) {
			dispatch('next');
		}
	}

	function prevPage() {
		if (currentPage > 1 && !loading) {
			dispatch('prev');
		}
	}

	// Generate page numbers to show
	$: pageNumbers = (() => {
		const delta = 2; // Show 2 pages on each side of current page
		const range = [];
		const rangeWithDots = [];

		for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
			range.push(i);
		}

		if (currentPage - delta > 2) {
			rangeWithDots.push(1, '...');
		} else {
			rangeWithDots.push(1);
		}

		rangeWithDots.push(...range);

		if (currentPage + delta < totalPages - 1) {
			rangeWithDots.push('...', totalPages);
		} else if (totalPages > 1) {
			rangeWithDots.push(totalPages);
		}

		return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
	})();
</script>

{#if totalPages > 1}
	<div class="flex flex-col items-center gap-4 mt-8">
		<!-- Navigation Buttons -->
		<div class="flex justify-center items-center gap-2">
			<button
				class="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				on:click={prevPage}
				disabled={currentPage === 1 || loading}
			>
				← Previous
			</button>

			<!-- Page Numbers -->
			<div class="flex gap-1">
				{#each pageNumbers as pageNum}
					{#if pageNum === '...'}
						<span class="px-3 py-2 text-gray-500">...</span>
					{:else}
						<button
							class="px-3 py-2 rounded-lg transition-colors font-medium {currentPage === pageNum ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
							on:click={() => goToPage(Number(pageNum))}
							disabled={loading}
						>
							{pageNum}
						</button>
					{/if}
				{/each}
			</div>

			<button
				class="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				on:click={nextPage}
				disabled={!hasNextPage || currentPage >= totalPages || loading}
			>
				Next →
			</button>
		</div>

		<!-- Page Info -->
		<div class="text-center text-gray-400 text-sm">
			Page {currentPage} of {totalPages}
		</div>
	</div>
{/if}
