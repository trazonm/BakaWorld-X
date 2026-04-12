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
		class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900/90 text-zinc-100 shadow-sm ring-1 ring-white/10 transition-colors hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
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
		<div
			class="absolute right-0 top-12 z-50 w-52 rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-md"
		>
			<div class="p-0.5">
				<button
					type="button"
					class={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
						$theme === 'dark'
							? 'bg-violet-600/90 text-white shadow-sm'
							: 'text-zinc-300 hover:bg-white/[0.06]'
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
					class={`mt-1 w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
						$theme === 'midnight'
							? 'bg-fuchsia-700/90 text-white shadow-sm'
							: 'text-zinc-300 hover:bg-white/[0.06]'
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

