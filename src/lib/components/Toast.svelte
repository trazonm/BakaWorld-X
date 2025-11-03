<!-- Toast Notification Component -->
<script lang="ts">
	import { onMount } from 'svelte';

	export let message: string = '';
	export let show: boolean = false;
	export let duration: number = 2000;

	let timeoutId: ReturnType<typeof setTimeout>;

	$: if (show && message) {
		// Clear any existing timeout
		if (timeoutId) clearTimeout(timeoutId);
		
		// Auto-hide after duration
		timeoutId = setTimeout(() => {
			show = false;
		}, duration);
	}

	onMount(() => {
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	});
</script>

{#if show && message}
	<div 
		class="fixed top-4 right-4 z-[9999] animate-slide-in"
		role="alert"
		aria-live="polite"
	>
		<div class="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-2xl border border-gray-700 flex items-center gap-3 min-w-[200px] max-w-[400px]">
			<!-- Check icon -->
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span class="text-sm font-medium">{message}</span>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}
</style>

