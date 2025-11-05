<!-- Audio Mute Button Component - Only visible in midnight mode -->
<script lang="ts">
	import { theme, audioMuted } from '$lib/stores/theme';

	function handleToggle() {
		theme.toggleMute();
	}
</script>

{#if $theme === 'midnight'}
	<button
		type="button"
		class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gray-900/90 text-white shadow-lg ring-1 ring-gray-700 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
		onclick={handleToggle}
		aria-label={$audioMuted ? 'Unmute audio' : 'Mute audio'}
		title={$audioMuted ? 'Unmute audio' : 'Mute audio'}
	>
		{#if $audioMuted}
			<!-- Muted icon -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
			</svg>
		{:else}
			<!-- Unmuted icon -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
			</svg>
		{/if}
	</button>
{/if}

