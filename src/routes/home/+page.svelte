<!-- EPIC ANIME HOME PAGE - THE MOMENT OF TRANSFORMATION -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { showResultsStore } from '$lib/stores/ui';
	import { theme, audioMuted } from '$lib/stores/theme';
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

	// Music visualizer state
	let analyser: AnalyserNode | null = null;
	let dataArray: Uint8Array | null = null;
	let animationFrameId: number | null = null;
	let ring1Scale = 1;
	let ring2Scale = 1;
	let ring3Scale = 1;
	let ring1Opacity = 0.3;
	let ring2Opacity = 0.2;
	let ring3Opacity = 0.1;
	let visualizerSetupAttempted = false;

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

	// Setup audio visualizer
	function setupAudioVisualizer() {
		if (typeof window === 'undefined') return;
		if (analyser || visualizerSetupAttempted) return; // Already set up or attempted
		
		const audioElement = theme.getAudio();
		if (!audioElement) return;
		
		// Get or create AudioContext (reuse from store)
		let audioContext = theme.getAudioContext();
		if (!audioContext) {
			audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			theme.setAudioContext(audioContext);
		}
		
		// Check if audio is actually ready to play
		if (audioElement.readyState < 2) {
			// Wait for audio to be ready
			audioElement.addEventListener('canplay', () => {
				setupAudioVisualizer();
			}, { once: true });
			return;
		}

		try {
			visualizerSetupAttempted = true;
			
			// Create AnalyserNode
			analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.8;
			
			const bufferLength = analyser.frequencyBinCount;
			dataArray = new Uint8Array(bufferLength);
			
			// Get or create audio source
			// Note: createMediaElementSource can only be called once per audio element
			// So we store it in the theme store to reuse it
			let audioSource = theme.getAudioSource();
			
			if (!audioSource) {
				// Create new source if it doesn't exist
				try {
					audioSource = audioContext.createMediaElementSource(audioElement);
					theme.setAudioSource(audioSource);
				} catch (sourceError: any) {
					// If source already exists, we can't create another one
					console.warn('Audio source already exists, cannot create visualizer:', sourceError);
					cleanupVisualizer();
					visualizerSetupAttempted = false;
					return;
				}
			}
			
			// Connect the source to analyser (reuse existing source if available)
			// Disconnect from any previous connections first
			try {
				audioSource.disconnect();
			} catch (e) {
				// Ignore if not connected
			}
			
			audioSource.connect(analyser);
			analyser.connect(audioContext.destination);
			
			// Resume AudioContext if suspended (required by some browsers)
			if (audioContext.state === 'suspended') {
				audioContext.resume().catch(() => {
					// Context might need user interaction to resume
					console.log('AudioContext suspended, will resume on user interaction');
				});
			}
			
			// Start visualization loop
			startVisualization();
		} catch (error) {
			console.warn('Could not set up audio visualizer:', error);
			// Cleanup on error
			cleanupVisualizer();
			visualizerSetupAttempted = false;
		}
	}

	// Visualization animation loop
	function startVisualization() {
		if (!analyser || !dataArray) return;
		
		function animate() {
			if (!analyser || !dataArray) return;
			
			// Check if audio is playing and unmuted
			const audioElement = theme.getAudio();
			const isPlaying = audioElement && !audioElement.paused && !audioElement.muted;
			const isMidnight = $theme === 'midnight';
			const isMuted = $audioMuted;
			
			if (isPlaying && isMidnight && !isMuted) {
				// Get frequency data
				analyser.getByteFrequencyData(dataArray);
				
				// Calculate average and peak values from different frequency ranges
				// Low frequencies (bass) - first 20% of data
				const bassStart = 0;
				const bassEnd = Math.floor(dataArray.length * 0.2);
				const bassAvg = dataArray.slice(bassStart, bassEnd).reduce((a, b) => a + b, 0) / (bassEnd - bassStart);
				
				// Mid frequencies - middle 40%
				const midStart = Math.floor(dataArray.length * 0.3);
				const midEnd = Math.floor(dataArray.length * 0.7);
				const midAvg = dataArray.slice(midStart, midEnd).reduce((a, b) => a + b, 0) / (midEnd - midStart);
				
				// High frequencies (treble) - last 30%
				const trebleStart = Math.floor(dataArray.length * 0.7);
				const trebleEnd = dataArray.length;
				const trebleAvg = dataArray.slice(trebleStart, trebleEnd).reduce((a, b) => a + b, 0) / (trebleEnd - trebleStart);
				
				// Normalize values (0-255 range) to 0-1, then scale
				const bassNormalized = (bassAvg / 255) * 0.5 + 1; // 1.0 to 1.5
				const midNormalized = (midAvg / 255) * 0.4 + 1; // 1.0 to 1.4
				const trebleNormalized = (trebleAvg / 255) * 0.3 + 1; // 1.0 to 1.3
				
				// Update ring scales based on frequency bands
				ring1Scale = bassNormalized;
				ring2Scale = midNormalized;
				ring3Scale = trebleNormalized;
				
				// Update opacity based on intensity
				ring1Opacity = Math.min(0.6, 0.3 + (bassAvg / 255) * 0.3);
				ring2Opacity = Math.min(0.5, 0.2 + (midAvg / 255) * 0.3);
				ring3Opacity = Math.min(0.4, 0.1 + (trebleAvg / 255) * 0.3);
			} else {
				// Reset to default when not playing
				ring1Scale = 1;
				ring2Scale = 1;
				ring3Scale = 1;
				ring1Opacity = 0.3;
				ring2Opacity = 0.2;
				ring3Opacity = 0.1;
			}
			
			animationFrameId = requestAnimationFrame(animate);
		}
		
		animate();
	}

	// Cleanup visualizer (but keep audio source and context in store)
	function cleanupVisualizer() {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		
		// Disconnect analyser but keep audio source connected to destination
		const audioSource = theme.getAudioSource();
		const audioContext = theme.getAudioContext();
		if (audioSource && analyser && audioContext) {
			try {
				// Disconnect analyser from destination
				analyser.disconnect();
				// Reconnect source directly to destination to keep audio playing
				audioSource.disconnect();
				audioSource.connect(audioContext.destination);
			} catch (e) {
				// Ignore disconnect errors
			}
		}
		
		analyser = null;
		dataArray = null;
		visualizerSetupAttempted = false;
		
		// Don't close audioContext - we need it to keep the source connected
		// The context will be reused when visualizer is set up again
	}

	onMount(() => {
		randomPowerLevel = getRandomPowerLevel();
		
		// Setup audio visualizer when audio is available
		const checkAndSetupVisualizer = () => {
			const audioElement = theme.getAudio();
			if (audioElement && $theme === 'midnight' && !$audioMuted) {
				// Only setup if not already set up
				if (!audioContext && !visualizerSetupAttempted) {
					// Check if audio is playing or ready
					if (!audioElement.paused || audioElement.readyState >= 2) {
						// Wait a bit for audio to be ready
						setTimeout(() => {
							setupAudioVisualizer();
						}, 500);
					} else {
						// Wait for audio to start playing
						const playHandler = () => {
							setTimeout(() => {
								setupAudioVisualizer();
							}, 500);
							audioElement.removeEventListener('play', playHandler);
						};
						audioElement.addEventListener('play', playHandler, { once: true });
					}
				}
			} else if ($theme !== 'midnight' || $audioMuted) {
				// Cleanup if conditions not met
				cleanupVisualizer();
			}
		};
		
		// Also check on theme/mute changes
		const unsubscribeTheme = theme.subscribe(() => {
			if ($theme !== 'midnight') {
				cleanupVisualizer();
			} else {
				// Wait a bit after theme change to ensure audio is ready
				setTimeout(() => {
					checkAndSetupVisualizer();
				}, 500);
			}
		});
		
		const unsubscribeMuted = audioMuted.subscribe(() => {
			if ($audioMuted) {
				cleanupVisualizer();
			} else {
				setTimeout(() => {
					checkAndSetupVisualizer();
				}, 300);
			}
		});
		
		// Check periodically for audio element (when switching themes)
		const visualizerCheckInterval = setInterval(() => {
			if ($theme === 'midnight' && !$audioMuted && !analyser && !visualizerSetupAttempted) {
				checkAndSetupVisualizer();
			}
		}, 1500);
		
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
		
		// Initial check
		checkAndSetupVisualizer();
		
		return () => {
			clearInterval(visualizerCheckInterval);
			unsubscribeTheme();
			unsubscribeMuted();
			cleanupVisualizer();
		};
	});

	onDestroy(() => {
		torrentManager.stopAllProgressPolling();
		cleanupVisualizer();
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
			box-shadow: 0 0 20px rgba(236, 72, 153, 0.6),
			            0 0 40px rgba(168, 85, 247, 0.4),
			            0 0 60px rgba(30, 58, 138, 0.3),
			            inset 0 0 20px rgba(236, 72, 153, 0.2);
		}
		50% {
			box-shadow: 0 0 30px rgba(236, 72, 153, 0.8),
			            0 0 60px rgba(168, 85, 247, 0.6),
			            0 0 90px rgba(30, 58, 138, 0.4),
			            inset 0 0 30px rgba(236, 72, 153, 0.3);
		}
	}

	@keyframes energyPulseDark {
		0%, 100% {
			box-shadow: 0 0 20px rgba(14, 165, 233, 0.6),
			            0 0 40px rgba(59, 130, 246, 0.4),
			            0 0 60px rgba(37, 99, 235, 0.3),
			            inset 0 0 20px rgba(14, 165, 233, 0.2);
		}
		50% {
			box-shadow: 0 0 30px rgba(14, 165, 233, 0.8),
			            0 0 60px rgba(59, 130, 246, 0.6),
			            0 0 90px rgba(37, 99, 235, 0.4),
			            inset 0 0 30px rgba(14, 165, 233, 0.3);
		}
	}

	@keyframes glowText {
		0%, 100% {
			text-shadow: 0 0 10px rgba(236, 72, 153, 0.9),
			             0 0 20px rgba(236, 72, 153, 0.7),
			             0 0 30px rgba(168, 85, 247, 0.5),
			             0 0 40px rgba(30, 58, 138, 0.4);
		}
		50% {
			text-shadow: 0 0 20px rgba(236, 72, 153, 1),
			             0 0 40px rgba(236, 72, 153, 0.9),
			             0 0 60px rgba(168, 85, 247, 0.7),
			             0 0 80px rgba(30, 58, 138, 0.5);
		}
	}

	@keyframes glowTextDark {
		0%, 100% {
			text-shadow: 0 0 10px rgba(14, 165, 233, 0.9),
			             0 0 20px rgba(59, 130, 246, 0.7),
			             0 0 30px rgba(37, 99, 235, 0.5),
			             0 0 40px rgba(30, 58, 138, 0.4);
		}
		50% {
			text-shadow: 0 0 20px rgba(14, 165, 233, 1),
			             0 0 40px rgba(59, 130, 246, 0.9),
			             0 0 60px rgba(37, 99, 235, 0.7),
			             0 0 80px rgba(30, 58, 138, 0.5);
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

	@keyframes premiumGlow {
		0%, 100% {
			box-shadow: 0 0 100px rgba(236, 72, 153, 0.4),
			            0 0 200px rgba(168, 85, 247, 0.3),
			            0 0 300px rgba(30, 58, 138, 0.2);
		}
		50% {
			box-shadow: 0 0 150px rgba(236, 72, 153, 0.6),
			            0 0 300px rgba(168, 85, 247, 0.4),
			            0 0 450px rgba(30, 58, 138, 0.3);
		}
	}

	@keyframes premiumGlowDark {
		0%, 100% {
			box-shadow: 0 0 100px rgba(14, 165, 233, 0.4),
			            0 0 200px rgba(59, 130, 246, 0.3),
			            0 0 300px rgba(37, 99, 235, 0.2);
		}
		50% {
			box-shadow: 0 0 150px rgba(14, 165, 233, 0.6),
			            0 0 300px rgba(59, 130, 246, 0.4),
			            0 0 450px rgba(37, 99, 235, 0.3);
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
			border-color: rgba(236, 72, 153, 0.6);
			box-shadow: 0 0 10px rgba(236, 72, 153, 0.4),
			            inset 0 0 10px rgba(168, 85, 247, 0.2);
		}
		50% {
			border-color: rgba(236, 72, 153, 0.9);
			box-shadow: 0 0 20px rgba(236, 72, 153, 0.6),
			            inset 0 0 15px rgba(168, 85, 247, 0.3);
		}
	}

	@keyframes searchGlowDark {
		0%, 100% {
			border-color: rgba(14, 165, 233, 0.6);
			box-shadow: 0 0 10px rgba(14, 165, 233, 0.4),
			            inset 0 0 10px rgba(59, 130, 246, 0.2);
		}
		50% {
			border-color: rgba(14, 165, 233, 0.9);
			box-shadow: 0 0 20px rgba(14, 165, 233, 0.6),
			            inset 0 0 15px rgba(59, 130, 246, 0.3);
		}
	}

	@keyframes buttonPower {
		0% {
			box-shadow: 0 0 10px rgba(236, 72, 153, 0.6),
			           0 0 20px rgba(168, 85, 247, 0.4);
		}
		50% {
			box-shadow: 0 0 20px rgba(236, 72, 153, 0.9),
			           0 0 40px rgba(168, 85, 247, 0.6),
			           0 0 60px rgba(30, 58, 138, 0.4);
		}
		100% {
			box-shadow: 0 0 10px rgba(236, 72, 153, 0.6),
			           0 0 20px rgba(168, 85, 247, 0.4);
		}
	}

	@keyframes buttonPowerDark {
		0% {
			box-shadow: 0 0 10px rgba(14, 165, 233, 0.6),
			           0 0 20px rgba(59, 130, 246, 0.4);
		}
		50% {
			box-shadow: 0 0 20px rgba(14, 165, 233, 0.9),
			           0 0 40px rgba(59, 130, 246, 0.6),
			           0 0 60px rgba(37, 99, 235, 0.4);
		}
		100% {
			box-shadow: 0 0 10px rgba(14, 165, 233, 0.6),
			           0 0 20px rgba(59, 130, 246, 0.4);
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

	/* Dark mode: use blue/cyan colors */
	:global([data-theme="dark"]) .glow-text {
		animation: glowTextDark 3s ease-in-out infinite !important;
	}

	:global([data-theme="dark"]) .energy-pulse {
		animation: energyPulseDark 2s ease-in-out infinite !important;
	}

	:global([data-theme="dark"]) .search-glow {
		animation: searchGlowDark 2s ease-in-out infinite !important;
		border-color: rgba(14, 165, 233, 0.6) !important;
	}

	:global([data-theme="dark"]) .button-power {
		animation: buttonPowerDark 2s ease-in-out infinite !important;
	}

	/* Neon Energy Background - Pure CSS (Midnight Theme) */
	.super-saiyan-background {
		position: fixed;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		overflow: hidden;
		background: radial-gradient(
			ellipse at center,
			rgba(236, 72, 153, 0.12) 0%,
			rgba(168, 85, 247, 0.08) 40%,
			rgba(30, 58, 138, 0.05) 70%,
			transparent 100%
		);
		background-size: 200% 200%;
		animation: superSaiyanAura 8s ease-in-out infinite;
	}

	/* Dark mode: blue/cyan background */
	:global([data-theme="dark"]) .super-saiyan-background {
		background: radial-gradient(
			ellipse at center,
			rgba(14, 165, 233, 0.12) 0%,
			rgba(59, 130, 246, 0.08) 40%,
			rgba(30, 58, 138, 0.05) 70%,
			transparent 100%
		) !important;
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
			rgba(236, 72, 153, 0.5) 0%,
			rgba(236, 72, 153, 0.35) 30%,
			rgba(168, 85, 247, 0.25) 60%,
			transparent 100%
		);
		animation: energyWave 10s ease-in-out infinite;
		filter: blur(40px);
		will-change: transform, opacity;
	}

	:global([data-theme="dark"]) .super-saiyan-orb {
		background: radial-gradient(
			circle,
			rgba(14, 165, 233, 0.5) 0%,
			rgba(14, 165, 233, 0.35) 30%,
			rgba(59, 130, 246, 0.25) 60%,
			transparent 100%
		) !important;
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
			rgba(168, 85, 247, 0.4) 0%,
			rgba(168, 85, 247, 0.25) 40%,
			rgba(30, 58, 138, 0.15) 70%,
			transparent 100%
		);
		animation: energyWave 15s ease-in-out infinite reverse;
		filter: blur(60px);
		animation-delay: -2s;
		will-change: transform, opacity;
	}

	:global([data-theme="dark"]) .super-saiyan-orb-2 {
		background: radial-gradient(
			circle,
			rgba(59, 130, 246, 0.4) 0%,
			rgba(59, 130, 246, 0.25) 40%,
			rgba(37, 99, 235, 0.15) 70%,
			transparent 100%
		) !important;
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
			rgba(236, 72, 153, 0.25) 0%,
			rgba(168, 85, 247, 0.2) 50%,
			rgba(30, 58, 138, 0.1) 100%
		);
		animation: premiumGlow 6s ease-in-out infinite;
		filter: blur(80px);
		will-change: transform, opacity;
	}

	:global([data-theme="dark"]) .super-saiyan-glow {
		background: radial-gradient(
			circle,
			rgba(14, 165, 233, 0.25) 0%,
			rgba(59, 130, 246, 0.2) 50%,
			rgba(37, 99, 235, 0.1) 100%
		) !important;
		animation: premiumGlowDark 6s ease-in-out infinite !important;
	}

	.aura-ring {
		position: absolute;
		border-radius: 50%;
		border: 2px solid rgba(236, 72, 153, 0.4);
		pointer-events: none;
		animation: auraGlow 3s ease-in-out infinite;
		box-shadow: 0 0 20px rgba(236, 72, 153, 0.3),
		            0 0 40px rgba(168, 85, 247, 0.2);
		transition: transform 0.1s ease-out, opacity 0.1s ease-out;
	}

	:global([data-theme="dark"]) .aura-ring {
		border-color: rgba(14, 165, 233, 0.4) !important;
		box-shadow: 0 0 20px rgba(14, 165, 233, 0.3),
		            0 0 40px rgba(59, 130, 246, 0.2) !important;
	}

	.search-glow {
		animation: searchGlow 2s ease-in-out infinite;
	}

	.button-power {
		animation: buttonPower 2s ease-in-out infinite;
		background: linear-gradient(135deg, #ec4899, #a855f7, #1e3a8a) !important;
		border-color: rgba(236, 72, 153, 0.6) !important;
		transition: all 0.3s ease;
	}

	.button-power:hover {
		background: linear-gradient(135deg, #f472b6, #c084fc, #2563eb) !important;
		border-color: rgba(236, 72, 153, 0.8) !important;
	}

	:global([data-theme="dark"]) .button-power {
		animation: buttonPowerDark 2s ease-in-out infinite !important;
		background: linear-gradient(135deg, #0ea5e9, #3b82f6, #2563eb) !important;
		border-color: rgba(14, 165, 233, 0.6) !important;
	}

	:global([data-theme="dark"]) .button-power:hover {
		background: linear-gradient(135deg, #38bdf8, #60a5fa, #3b82f6) !important;
		border-color: rgba(14, 165, 233, 0.8) !important;
	}

	.welcome-username {
		color: #ec4899;
	}

	:global([data-theme="dark"]) .welcome-username {
		color: #0ea5e9 !important;
	}

	.welcome-glow {
		background: linear-gradient(to right, rgba(236, 72, 153, 0.6), rgba(168, 85, 247, 0.6), rgba(30, 58, 138, 0.5));
	}

	:global([data-theme="dark"]) .welcome-glow {
		background: linear-gradient(to right, rgba(14, 165, 233, 0.6), rgba(59, 130, 246, 0.6), rgba(37, 99, 235, 0.5)) !important;
	}

	.search-input-border {
		border-color: rgba(236, 72, 153, 0.6);
	}

	:global([data-theme="dark"]) .search-input-border {
		border-color: rgba(14, 165, 233, 0.6) !important;
	}

	/* Override searchGlow animation border colors in dark mode */
	:global([data-theme="dark"]) .search-glow {
		border-color: rgba(14, 165, 233, 0.6) !important;
	}

	.power-level-text {
		color: #ec4899;
		text-shadow: 0 0 10px rgba(236, 72, 153, 0.8);
	}

	:global([data-theme="dark"]) .power-level-text {
		color: #0ea5e9 !important;
		text-shadow: 0 0 10px rgba(14, 165, 233, 0.8) !important;
	}

	.power-level-border {
		border: 1px solid rgba(236, 72, 153, 0.4);
	}

	:global([data-theme="dark"]) .power-level-border {
		border-color: rgba(14, 165, 233, 0.4) !important;
	}

	.power-level-bar {
		background: linear-gradient(90deg, #ec4899, #a855f7, #1e3a8a);
		animation: energyPulse 2s ease-in-out infinite;
	}

	:global([data-theme="dark"]) .power-level-bar {
		background: linear-gradient(90deg, #0ea5e9, #3b82f6, #2563eb) !important;
		animation: energyPulseDark 2s ease-in-out infinite !important;
	}

	:global([data-theme="dark"]) .baka-underline {
		background: linear-gradient(to right, transparent, #0ea5e9, transparent) !important;
		box-shadow: 0 0 10px rgba(14, 165, 233, 0.6) !important;
	}

	/* Ensure all purple/pink colors are replaced in dark mode */
	[data-theme="dark"] * {
		/* Remove any purple/pink from gradients that might leak through */
	}

	/* More specific overrides for dark mode */
	[data-theme="dark"] .super-saiyan-background,
	[data-theme="dark"] .super-saiyan-orb,
	[data-theme="dark"] .super-saiyan-orb-2,
	[data-theme="dark"] .super-saiyan-glow {
		/* Force blue colors only */
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
	<!-- Energy Aura Rings with Music Visualizer -->
	<div 
		class="aura-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96" 
		style="animation-delay: 0s; transform: scale({ring1Scale}); opacity: {ring1Opacity};"
	></div>
	<div 
		class="aura-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem]" 
		style="animation-delay: 0.5s; transform: scale({ring2Scale}); opacity: {ring2Opacity};"
	></div>
	<div 
		class="aura-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem]" 
		style="animation-delay: 1s; transform: scale({ring3Scale}); opacity: {ring3Opacity};"
	></div>

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
			<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-60 baka-underline" style="box-shadow: 0 0 10px rgba(236, 72, 153, 0.6);"></div>
		</div>

		<!-- Welcome Text with Neon Energy -->
		<h1 class="mb-12 text-5xl md:text-7xl font-black text-white glow-text relative text-center">
			<span class="relative z-10">Welcome, </span>
			<span class="relative z-10 welcome-username">
				{username}
			</span>
			<div class="absolute inset-0 blur-xl welcome-glow opacity-60"></div>
		</h1>

		<!-- EPIC SEARCH BAR -->
		<form class="flex w-full px-4 md:px-0 relative z-10" on:submit={handleSearch}>
			<div class="relative w-full flex items-center">
				<!-- Search Input with Energy Glow -->
				<input
					type="text"
					placeholder="Search for torrents..."
					class="flex-1 rounded-l-xl md:rounded-l-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-4 md:py-5 focus:outline-none text-lg md:text-xl font-semibold search-glow border-2 backdrop-blur-sm search-input-border"
					style="transition: all 0.3s ease;"
					required
				/>
				
				<!-- Power Button -->
				<button
					type="submit"
					class="rounded-r-xl md:rounded-r-2xl px-8 md:px-12 py-4 md:py-5 font-black text-white touch-manipulation min-h-[44px] text-lg md:text-xl button-power border-2 relative overflow-hidden transition-all duration-300 transform hover:scale-105"
				>
					<span class="relative z-10 flex items-center gap-2">
						Search
					</span>
					<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] hover:translate-x-[200%] transition-transform duration-1000"></div>
				</button>
			</div>
		</form>

		<!-- Power Level Indicator -->
		<div class="mt-8 text-center">
			<div class="text-sm md:text-base font-bold mb-2 power-level-text">{randomPowerLevel}</div>
			<div class="w-64 h-2 bg-gray-800 rounded-full overflow-hidden power-level-border">
				<div class="h-full rounded-full relative overflow-hidden power-level-bar" 
				     style="width: 100%;">
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

