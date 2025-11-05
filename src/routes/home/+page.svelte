<!-- EPIC ANIME HOME PAGE - THE MOMENT OF TRANSFORMATION -->
<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
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

	// Super Saiyan Golden Energy System - COMPLETE REBUILD
	let particles: Array<{
		id: number;
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		life: number;
		maxLife: number;
		type: 'spark' | 'energy' | 'burst';
	}> = [];

	let animationFrame: number;
	let particleIdCounter = 0;
	let lastUpdateTime = 0;
	const UPDATE_INTERVAL = 16; // ~60fps but throttled

	function createParticle(type: 'spark' | 'energy' | 'burst', centerX?: number, centerY?: number) {
		const cx = centerX ?? Math.random() * window.innerWidth;
		const cy = centerY ?? Math.random() * window.innerHeight;
		const angle = Math.random() * Math.PI * 2;
		const speed = type === 'spark' ? 0.3 + Math.random() * 1 : type === 'energy' ? 0.5 + Math.random() * 1.5 : 1 + Math.random() * 2;
		
		return {
			id: particleIdCounter++,
			x: cx + (Math.random() - 0.5) * (type === 'burst' ? 300 : 200),
			y: cy + (Math.random() - 0.5) * (type === 'burst' ? 300 : 200),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: type === 'spark' ? 5 + Math.random() * 8 : type === 'energy' ? 10 + Math.random() * 15 : 20 + Math.random() * 25,
			life: 0,
			maxLife: type === 'spark' ? 200 + Math.random() * 200 : type === 'energy' ? 300 + Math.random() * 200 : 400 + Math.random() * 300,
			type
		};
	}

	function generateParticles() {
		particles = [];
		// Create initial burst of particles spread across screen
		for (let i = 0; i < 200; i++) {
			particles.push(createParticle('spark'));
		}
		for (let i = 0; i < 80; i++) {
			particles.push(createParticle('energy'));
		}
		for (let i = 0; i < 30; i++) {
			particles.push(createParticle('burst'));
		}
	}

	async function animateParticles() {
		const now = performance.now();
		const deltaTime = now - lastUpdateTime;
		
		// Throttle updates to reduce flashing
		if (deltaTime < UPDATE_INTERVAL) {
			animationFrame = requestAnimationFrame(animateParticles);
			return;
		}
		
		lastUpdateTime = now;
		
		// Update existing particles - mutate in place for better performance
		const updatedParticles = particles.map(p => {
			const newLife = p.life + 1;
			
			if (newLife >= p.maxLife) {
				// Replace with new particle
				return createParticle(p.type);
			}
			
			// Update particle
			return {
				...p,
				x: p.x + p.vx,
				y: p.y + p.vy,
				life: newLife,
				vx: p.vx * 0.99, // Slight slowdown
				vy: p.vy * 0.99
			};
		});

		// Add occasional new burst particles
		if (Math.random() < 0.05) {
			updatedParticles.push(createParticle('burst', window.innerWidth / 2, window.innerHeight / 2));
		}

		// Update array - using tick to batch DOM updates
		particles = updatedParticles;
		await tick();

		animationFrame = requestAnimationFrame(animateParticles);
	}

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
		generateParticles();
		animateParticles();
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
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
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

	@keyframes superSaiyanPulse {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
			filter: brightness(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.2);
			filter: brightness(1.5);
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

	/* Super Saiyan Golden Energy Particles */
	.particle {
		position: fixed;
		border-radius: 50%;
		pointer-events: none;
		animation: superSaiyanPulse 1.5s ease-in-out infinite;
		will-change: transform, opacity;
		z-index: 2;
		transform: translate(-50%, -50%);
	}

	.particle.spark {
		background: radial-gradient(circle, 
			rgba(255, 255, 255, 1) 0%,
			rgba(255, 255, 0, 1) 25%,
			rgba(255, 215, 0, 0.9) 50%,
			rgba(255, 165, 0, 0.7) 75%,
			transparent 100%
		);
		box-shadow: 
			0 0 10px rgba(255, 255, 0, 1),
			0 0 20px rgba(255, 215, 0, 0.9),
			0 0 30px rgba(255, 165, 0, 0.7),
			0 0 40px rgba(255, 140, 0, 0.5);
		filter: brightness(1.5) drop-shadow(0 0 5px rgba(255, 215, 0, 1));
	}

	.particle.energy {
		background: radial-gradient(circle, 
			rgba(255, 255, 255, 1) 0%,
			rgba(255, 255, 0, 1) 20%,
			rgba(255, 215, 0, 1) 40%,
			rgba(255, 165, 0, 0.9) 60%,
			rgba(255, 140, 0, 0.7) 80%,
			transparent 100%
		);
		box-shadow: 
			0 0 15px rgba(255, 255, 0, 1),
			0 0 30px rgba(255, 215, 0, 1),
			0 0 45px rgba(255, 165, 0, 0.9),
			0 0 60px rgba(255, 140, 0, 0.7),
			0 0 75px rgba(255, 120, 0, 0.5);
		filter: brightness(1.8) drop-shadow(0 0 8px rgba(255, 215, 0, 1));
	}

	.particle.burst {
		background: radial-gradient(circle, 
			rgba(255, 255, 255, 1) 0%,
			rgba(255, 255, 0, 1) 15%,
			rgba(255, 215, 0, 1) 30%,
			rgba(255, 165, 0, 1) 50%,
			rgba(255, 140, 0, 0.9) 70%,
			rgba(255, 120, 0, 0.7) 85%,
			transparent 100%
		);
		box-shadow: 
			0 0 20px rgba(255, 255, 0, 1),
			0 0 40px rgba(255, 215, 0, 1),
			0 0 60px rgba(255, 165, 0, 1),
			0 0 80px rgba(255, 140, 0, 0.9),
			0 0 100px rgba(255, 120, 0, 0.7),
			0 0 120px rgba(255, 100, 0, 0.5);
		filter: brightness(2) drop-shadow(0 0 12px rgba(255, 215, 0, 1));
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

	.home-background-particles {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 2;
		overflow: hidden;
		pointer-events: none;
	}

</style>

<div class="home-background-layer">
	<div class="home-background-gradient epic-gradient"></div>
			<div class="home-background-particles">
		{#each particles as particle (particle.id)}
			<div 
				class="particle {particle.type}"
				style="
					left: {particle.x}px;
					top: {particle.y}px;
					width: {particle.size}px;
					height: {particle.size}px;
					opacity: {Math.max(0.3, 1 - (particle.life / particle.maxLife) * 0.7)};
				"
			></div>
		{/each}
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

