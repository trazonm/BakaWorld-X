<!-- Theme Toggle Component -->
<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let containerElement: HTMLDivElement;

	onMount(() => {
		theme.init();
		
		// Close dropdown when clicking outside
		const handleClickOutside = (event: MouseEvent) => {
			if (containerElement && !containerElement.contains(event.target as Node)) {
				isOpen = false;
			}
		};
		
		document.addEventListener('click', handleClickOutside);
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function toggleTheme() {
		theme.toggle();
		isOpen = false;
	}

	function setTheme(newTheme: 'dark' | 'midnight') {
		theme.set(newTheme);
		isOpen = false;
	}
</script>

<div class="relative theme-toggle-container" bind:this={containerElement}>
	<!-- Theme Toggle Button -->
	<button
		type="button"
		class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gray-900/90 text-white shadow-lg ring-1 ring-gray-700 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
		onclick={() => isOpen = !isOpen}
		aria-label="Toggle theme"
		aria-expanded={isOpen}
	>
		{#if $theme === 'midnight'}
			<!-- Midnight icon -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
			</svg>
		{:else}
			<!-- Dark mode icon -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
		{/if}
	</button>

	<!-- Theme Dropdown Menu -->
	{#if isOpen}
		<div class="absolute right-0 top-12 z-50 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
			<div class="p-2">
				<button
					type="button"
					class={`w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
						$theme === 'dark'
							? 'bg-blue-600 text-white'
							: 'text-gray-300 hover:bg-gray-800'
					}`}
					onclick={() => setTheme('dark')}
				>
					<div class="flex items-center gap-3">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
						<span>Dark</span>
					</div>
				</button>
				<button
					type="button"
					class={`w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors mt-1 ${
						$theme === 'midnight'
							? 'bg-blue-600 text-white'
							: 'text-gray-300 hover:bg-gray-800'
					}`}
					onclick={() => setTheme('midnight')}
				>
					<div class="flex items-center gap-3">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
						</svg>
						<span>Midnight</span>
					</div>
				</button>
			</div>
	</div>
{/if}
</div>

