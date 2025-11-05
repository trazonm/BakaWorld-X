<!-- EPIC ANIME HOME PAGE - THE MOMENT OF TRANSFORMATION -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { showResultsStore } from '$lib/stores/ui';
	import { useTorrentManager } from '$lib/composables/useTorrentManager';
	import SearchModal from '$lib/components/SearchModal.svelte';
	import type { SearchResult } from '$lib/types';

	let searchResults: SearchResult[] = []; // All search results
	let searchLoading = false;
	let searchError = '';
	let username = '';
	let modalSearch = '';

	let sortKey: 'Title' | 'Size' | 'Seeders' = 'Seeders';
	let sortDirection: 'asc' | 'desc' = 'desc';

	const torrentManager = useTorrentManager();

	// Random edgy Gen Z/Gen Alpha power level messages (Minecraft-style)
	const powerLevelMessages = [
		'POWER LEVEL: OVER 9000',
		'TOUCH GRASS: NEVER',
		'TOUCHING GRASS: SKILL ISSUE',
		'GYATT LEVEL: MAXIMUM',
		'RIZZ: INFINITE',
		'POWER: UNMEASURABLE',
		'ENERGY: NO BITCHES',
		'KI: OFF THE CHARTS',
		'POWER: UNSTOPPABLE',
		'STRENGTH: LEGENDARY',
		'SIGMA: ACTIVATED',
		'POWER: DIVINE',
		'ENERGY: CELESTIAL',
		'KI: ULTIMATE',
		'POWER LEVEL: GODLY',
		'STRENGTH: IMMORTAL',
		'KI: ETERNAL',
		'POWER: ABSOLUTE',
		'ENERGY: BOUNDLESS',
		'KI LEVEL: INFINITE',
		'POWER: UNBREAKABLE',
		'STRENGTH: UNPARALLELED',
		'KI: SUPREME',
		'POWER LEVEL: TRANSCENDENT',
		'ENERGY: UNFATHOMABLE',
		'KI: UNLIMITED',
		'POWER: OMNIPOTENT',
		'STRENGTH: LEGENDARY WARRIOR',
		'KI: SUPER SAIYAN GOD',
		'POWER LEVEL: ZENO LEVEL',
		'ENERGY: MULTIVERSAL',
		'KI: ULTRA INSTINCT',
		'POWER: MASTERED UI',
		'STRENGTH: BEYOND GODS',
		'RIZZ: UNLIMITED',
		'GYATT: OVERFLOWING',
		'TOUCH GRASS: DENIED',
		'SIGMA: GRINDSET',
		'POWER: NO LIFE',
		'ENERGY: CHRONICALLY ONLINE',
		'KI: TERMINALLY ONLINE',
		'POWER LEVEL: NO GRASS',
		'STRENGTH: BASED',
		'KI: CRINGE COMPILATION',
		'POWER: SKIBIDI',
		'ENERGY: FANUM TAX',
		'KI: OHIO FINAL BOSS',
		'POWER LEVEL: SIGMA MALE',
		'STRENGTH: ALPHA GIGACHAD',
		'KI: BETA CUCK',
		'POWER: NO MAIDENS',
		'ENERGY: VIRGIN ENERGY',
		'KI: CHAD VIBES',
		'POWER LEVEL: MENTALLY ILL',
		'STRENGTH: UNMEDICATED',
		'KI: AUTISTIC STRENGTH',
		'POWER: ADHD MODE',
		'ENERGY: BIPOLAR',
		'KI: SCHIZOPHRENIC',
		'POWER LEVEL: INSANE',
		'STRENGTH: PSYCHOTIC',
		'KI: MANIC EPISODE',
		'POWER: UNHINGED',
		'ENERGY: FERAL',
		'KI: DERANGED',
		'POWER LEVEL: MENTALLY UNSTABLE',
		'STRENGTH: UNHINGED',
		'KI: CRACKED',
		'POWER: GOATED',
		'ENERGY: NO CAP',
		'KI: FR FR',
		'POWER LEVEL: ON GOD',
		'STRENGTH: DEADASS',
		'KI: LOWKEY',
		'POWER: HIGHKEY',
		'ENERGY: SUS',
		'KI: AMOGUS',
		'POWER LEVEL: IMPOSTER',
		'STRENGTH: VENTED',
		'KI: EJECTED',
		'POWER: EMERGENCY MEETING',
		'ENERGY: AMONG US',
		'KI: SUSSY BAKA'
	];

	let randomPowerLevel = '';

	function getRandomPowerLevel() {
		return powerLevelMessages[Math.floor(Math.random() * powerLevelMessages.length)];
	}

	// Removed particle system - using pure CSS animations instead

	// Sort and filter results for display
	$: sortedResults = [...searchResults].sort((a, b) => {
		let aVal = a[sortKey];
		let bVal = b[sortKey];
		if (sortKey === 'Size' || sortKey === 'Seeders') {
			aVal = parseFloat(aVal.toString()) || 0;
			bVal = parseFloat(bVal.toString()) || 0;
		}
		if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
		if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
		return 0;
	});

	// Apply filter to sorted results
	$: filteredResults = sortedResults.filter(
		(r) => !modalSearch || r.Title?.toLowerCase().includes(modalSearch.trim().toLowerCase())
	);

	onMount(() => {
		randomPowerLevel = getRandomPowerLevel();
		const init = async () => {
			await refreshAuth();
			const { isLoggedIn, username: uname } = get(auth);
			username = uname || '';
			if (!isLoggedIn) {
				goto('/');
				return;
			}

			await torrentManager.initializeRowStatusFromDownloads();
			torrentManager.startProgressPolling();

			// Background polling - runs every 5 seconds to update progress in database
			const backgroundPollInterval = setInterval(() => {
				fetch('/api/torrents/poll-progress', { method: 'POST' })
					.catch(err => console.error('Background polling error:', err));
			}, 5000);

			// Refresh state when page becomes visible
			const handleVisibilityChange = async () => {
				if (!document.hidden) {
					await torrentManager.initializeRowStatusFromDownloads();
					// Trigger immediate background poll on visibility
					fetch('/api/torrents/poll-progress', { method: 'POST' })
						.catch(err => console.error('Background polling error:', err));
				}
			};
			document.addEventListener('visibilitychange', handleVisibilityChange);

			return () => {
				clearInterval(backgroundPollInterval);
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			};
		};
		
		init();
	});

	onDestroy(() => {
		torrentManager.stopAllProgressPolling();
	});

	async function handleSearch(e: Event) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const input = form.querySelector('input[type="text"]') as HTMLInputElement;
		const query = input.value.trim();
		if (!query) return;

		searchLoading = true;
		searchError = '';
		showResultsStore.set(true);

		try {
			const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
			if (!res.ok) throw new Error('Failed to fetch search results');
			const data = await res.json();
			let results = data.Results || [];
			
			// Filter out torrents with less than 5 seeders (not worth checking or displaying)
			const minSeeders = 5;
			results = results.filter((r: SearchResult) => {
				const seeders = parseInt(r.Seeders?.toString() || '0', 10);
				return seeders >= minSeeders;
			});
			
			console.log(`Filtered ${data.Results?.length || 0} results to ${results.length} results (min ${minSeeders} seeders)`);
			
			// Store all results immediately
			searchResults = results;
			
			// Map existing downloads to search results by GUID only (no hash checking)
			const downloads = await torrentManager.initializeRowStatusFromDownloads();
			const resultsWithIds = await torrentManager.updateSearchResultsWithBackendIds(results, downloads);
			searchResults = resultsWithIds;
		} catch (err: any) {
			searchError = err.message || 'Unknown error';
		} finally {
			searchLoading = false;
		}
	}

	function handleSort(key: 'Title' | 'Size' | 'Seeders') {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	async function handleAddToQueue(result: SearchResult) {
		const backendId = await torrentManager.handleAddToQueue(result);
		
		// Update the search results with the new backend ID
		if (backendId) {
			const idx = searchResults.findIndex(r => r.Guid === result.Guid && r.Title === result.Title);
			if (idx !== -1) {
				searchResults[idx] = { ...searchResults[idx], id: backendId };
				searchResults = [...searchResults]; // Trigger reactivity
			}
		}
	}
</script>

<svelte:head>
	<title>BakaWorld X - Home</title>
</svelte:head>

<style>
	@keyframes powerUp {
		0% {
			transform: scale(0.8);
			opacity: 0;
			filter: brightness(0.5);
		}
		50% {
			transform: scale(1.05);
			filter: brightness(1.5);
		}
		100% {
			transform: scale(1);
			opacity: 1;
			filter: brightness(1);
		}
	}

	@keyframes energyPulse {
		0%, 100% {
			box-shadow: 0 0 20px rgba(255, 215, 0, 0.4),
			            0 0 40px rgba(255, 215, 0, 0.3),
			            0 0 60px rgba(255, 165, 0, 0.2),
			            inset 0 0 20px rgba(255, 215, 0, 0.1);
		}
		50% {
			box-shadow: 0 0 30px rgba(255, 215, 0, 0.6),
			            0 0 60px rgba(255, 215, 0, 0.4),
			            0 0 90px rgba(255, 165, 0, 0.3),
			            inset 0 0 30px rgba(255, 215, 0, 0.2);
		}
	}

	@keyframes glowText {
		0%, 100% {
			text-shadow: 0 0 10px rgba(255, 215, 0, 0.8),
			             0 0 20px rgba(255, 215, 0, 0.6),
			             0 0 30px rgba(255, 165, 0, 0.4),
			             0 0 40px rgba(255, 140, 0, 0.3);
		}
		50% {
			text-shadow: 0 0 20px rgba(255, 215, 0, 1),
			             0 0 40px rgba(255, 215, 0, 0.8),
			             0 0 60px rgba(255, 165, 0, 0.6),
			             0 0 80px rgba(255, 140, 0, 0.4);
		}
	}

	@keyframes superSaiyanAura {
		0% {
			background-position: 0% 50%;
			opacity: 0.3;
		}
		50% {
			background-position: 100% 50%;
			opacity: 0.6;
		}
		100% {
			background-position: 0% 50%;
			opacity: 0.3;
		}
	}

	@keyframes energyWave {
		0% {
			transform: scale(1) rotate(0deg);
			opacity: 0.2;
		}
		50% {
			transform: scale(1.1) rotate(180deg);
			opacity: 0.4;
		}
		100% {
			transform: scale(1) rotate(360deg);
			opacity: 0.2;
		}
	}

	@keyframes goldenGlow {
		0%, 100% {
			box-shadow: 0 0 100px rgba(255, 215, 0, 0.3),
			            0 0 200px rgba(255, 165, 0, 0.2),
			            0 0 300px rgba(255, 140, 0, 0.1);
		}
		50% {
			box-shadow: 0 0 150px rgba(255, 215, 0, 0.5),
			            0 0 300px rgba(255, 165, 0, 0.3),
			            0 0 450px rgba(255, 140, 0, 0.2);
		}
	}

	@keyframes auraGlow {
		0%, 100% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.1);
		}
	}

	@keyframes searchGlow {
		0%, 100% {
			border-color: rgba(255, 215, 0, 0.5);
			box-shadow: 0 0 10px rgba(255, 215, 0, 0.3),
			            inset 0 0 10px rgba(255, 215, 0, 0.1);
		}
		50% {
			border-color: rgba(255, 215, 0, 0.8);
			box-shadow: 0 0 20px rgba(255, 215, 0, 0.5),
			            inset 0 0 15px rgba(255, 215, 0, 0.2);
		}
	}

	@keyframes buttonPower {
		0% {
			box-shadow: 0 0 10px rgba(59, 130, 246, 0.5),
			           0 0 20px rgba(59, 130, 246, 0.3);
		}
		50% {
			box-shadow: 0 0 20px rgba(59, 130, 246, 0.8),
			           0 0 40px rgba(59, 130, 246, 0.5),
			           0 0 60px rgba(59, 130, 246, 0.3);
		}
		100% {
			box-shadow: 0 0 10px rgba(59, 130, 246, 0.5),
			           0 0 20px rgba(59, 130, 246, 0.3);
		}
	}

	@keyframes bakaSlide {
		0% {
			transform: translateX(-200%);
			opacity: 0;
		}
		60% {
			transform: translateX(10%);
		}
		100% {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.power-up-animation {
		animation: powerUp 1.5s ease-out;
	}

	.energy-pulse {
		animation: energyPulse 2s ease-in-out infinite;
	}

	.glow-text {
		animation: glowText 3s ease-in-out infinite;
	}

	/* Super Saiyan Golden Energy Background - Pure CSS */
	.super-saiyan-background {
		position: fixed;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		overflow: hidden;
		background: radial-gradient(
			ellipse at center,
			rgba(255, 215, 0, 0.1) 0%,
			rgba(255, 165, 0, 0.05) 40%,
			transparent 70%
		);
		background-size: 200% 200%;
		animation: superSaiyanAura 8s ease-in-out infinite;
	}

	.super-saiyan-orb {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 600px;
		height: 600px;
		margin: -300px 0 0 -300px;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(255, 255, 0, 0.4) 0%,
			rgba(255, 215, 0, 0.3) 30%,
			rgba(255, 165, 0, 0.2) 60%,
			transparent 100%
		);
		animation: energyWave 10s ease-in-out infinite;
		filter: blur(40px);
		will-change: transform, opacity;
	}

	.super-saiyan-orb-2 {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 800px;
		height: 800px;
		margin: -400px 0 0 -400px;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(255, 215, 0, 0.3) 0%,
			rgba(255, 165, 0, 0.2) 40%,
			rgba(255, 140, 0, 0.1) 70%,
			transparent 100%
		);
		animation: energyWave 15s ease-in-out infinite reverse;
		filter: blur(60px);
		animation-delay: -2s;
		will-change: transform, opacity;
	}

	.super-saiyan-glow {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 1000px;
		height: 1000px;
		margin: -500px 0 0 -500px;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(255, 255, 0, 0.2) 0%,
			rgba(255, 215, 0, 0.15) 50%,
			transparent 100%
		);
		animation: goldenGlow 6s ease-in-out infinite;
		filter: blur(80px);
		will-change: transform, opacity;
	}

	.aura-ring {
		position: absolute;
		border-radius: 50%;
		border: 2px solid rgba(255, 215, 0, 0.3);
		pointer-events: none;
		animation: auraGlow 3s ease-in-out infinite;
	}

	.search-glow {
		animation: searchGlow 2s ease-in-out infinite;
	}

	.button-power {
		animation: buttonPower 2s ease-in-out infinite;
	}

	.baka-slide {
		animation: bakaSlide 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
	}

	.epic-gradient {
		background: var(--theme-bg-primary);
		background-size: 200% 200%;
		animation: gradientShift 10s ease infinite;
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%) skewX(-15deg);
		}
		100% {
			transform: translateX(200%) skewX(-15deg);
		}
	}

	.home-background-layer {
		position: fixed;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		overflow: visible;
	}

	.home-background-gradient {
		position: absolute;
		inset: 0;
		background-color: var(--theme-bg-primary);
		z-index: 0;
	}


</style>

<div class="home-background-layer">
	<div class="home-background-gradient epic-gradient"></div>
	<div class="super-saiyan-background">
		<div class="super-saiyan-glow"></div>
		<div class="super-saiyan-orb"></div>
		<div class="super-saiyan-orb-2"></div>
	</div>
</div>

<main class="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center w-full relative overflow-hidden z-10 epic-gradient">
	<!-- Energy Aura Rings -->
	<div class="aura-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-30" style="animation-delay: 0s;"></div>
	<div class="aura-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] opacity-20" style="animation-delay: 0.5s;"></div>
	<div class="aura-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] opacity-10" style="animation-delay: 1s;"></div>

	<!-- Main Content -->
	<div class="flex flex-col items-center justify-center w-screen max-w-4xl mb-40 relative z-10 power-up-animation">
		<!-- EPIC BAKA TEXT -->
		<div class="relative mb-4">
			<!-- <div class="baka-slide">
				<span class="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 drop-shadow-2xl" 
				      style="
				      	background-size: 200% 200%;
				      	animation: gradientShift 3s ease infinite;
				      	text-shadow: 0 0 30px rgba(255, 215, 0, 0.8),
				      	             0 0 60px rgba(255, 165, 0, 0.6),
				      	             0 0 90px rgba(255, 140, 0, 0.4);
				      ">
					BAKA
				</span>
			</div> -->
			<!-- <div class="absolute -top-2 -right-2 text-yellow-400 text-2xl md:text-4xl font-bold opacity-75 energy-pulse">
				⚡
			</div> -->
			<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50"></div>
		</div>

		<!-- Welcome Text with Super Saiyan Energy -->
		<h1 class="mb-12 text-5xl md:text-7xl font-black text-white glow-text relative text-center">
			<span class="relative z-10">Welcome, </span>
			<span class="relative z-10 text-yellow-400">
				{username}
			</span>
			<div class="absolute inset-0 blur-xl bg-gradient-to-r from-yellow-400/50 via-orange-500/50 to-yellow-400/50 opacity-50"></div>
		</h1>

		<!-- EPIC SEARCH BAR -->
		<form class="flex w-full px-4 md:px-0 relative z-10" on:submit={handleSearch}>
			<div class="relative w-full flex items-center">
				<!-- Search Input with Energy Glow -->
				<input
					type="text"
					placeholder="Search for torrents..."
					class="flex-1 rounded-l-xl md:rounded-l-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-4 md:py-5 focus:outline-none text-lg md:text-xl font-semibold search-glow border-2 border-yellow-500/50 backdrop-blur-sm"
					style="transition: all 0.3s ease;"
					required
				/>
				
				<!-- Power Button -->
				<button
					type="submit"
					class="rounded-r-xl md:rounded-r-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 px-8 md:px-12 py-4 md:py-5 font-black text-white hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 touch-manipulation min-h-[44px] text-lg md:text-xl button-power border-2 border-blue-400/50 relative overflow-hidden transition-all duration-300 transform hover:scale-105"
				>
					<span class="relative z-10 flex items-center gap-2">
						SEARCH
					</span>
					<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] hover:translate-x-[200%] transition-transform duration-1000"></div>
				</button>
			</div>
		</form>

		<!-- Power Level Indicator -->
		<div class="mt-8 text-center">
			<div class="text-yellow-400/80 text-sm md:text-base font-bold mb-2">{randomPowerLevel}</div>
			<div class="w-64 h-2 bg-gray-800 rounded-full overflow-hidden border border-yellow-500/30">
				<div class="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-full relative overflow-hidden" 
				     style="width: 100%; animation: energyPulse 2s ease-in-out infinite;">
					<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite]"></div>
				</div>
			</div>
		</div>
	</div>

	<SearchModal
		results={filteredResults}
		loading={searchLoading}
		error={searchError}
		bind:modalSearch
		{sortKey}
		{sortDirection}
		onSort={handleSort}
		onAddToQueue={handleAddToQueue}
	/>
</main>

