<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { navigating } from '$app/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	let {
		anime,
		episode,
		videoData,
		nextEpisode,
		prevEpisode,
		animeId,
		episodeId
	} = data;
	$: ({
		anime,
		episode,
		videoData,
		nextEpisode,
		prevEpisode,
		animeId,
		episodeId
	} = data);

	let selectedLanguage = 'sub';
	let loading = false;
	let error = '';

	// Skip Filler toggle state
	const SKIP_FILLER_STORAGE_KEY = 'bakaworld-skip-filler';
	let skipFiller = false;

	// Autoplay state
	const AUTOPLAY_STORAGE_KEY = 'bakaworld-autoplay';
	let autoplay = false;

	// Language options for MegaPlay
	const languages = [
		{ name: 'sub', label: 'Subbed' },
		{ name: 'dub', label: 'Dubbed' }
	];

	// Skip Filler options
	const skipFillerOptions = [
		{ value: 'false', label: 'Show All' },
		{ value: 'true', label: 'Skip Filler' }
	];

	// Autoplay options
	const autoplayOptions = [
		{ value: 'false', label: 'Off' },
		{ value: 'true', label: 'On' }
	];

	// Skip filler dropdown value
	let skipFillerValue = 'false';

	// Autoplay dropdown value
	let autoplayValue = 'false';

	// Autoplay tracking
	let autoplayCheckInterval: ReturnType<typeof setInterval> | null = null;
	let iframeObserver: MutationObserver | null = null;
	let pageLoadTime = Date.now();
	let lastUserActivity = Date.now();
	let lastIframeSrc = '';
	let hasAdvanced = false;
	let videoEndedListenerAdded = false;
	let scrollHandler: ((e: Event) => void) | null = null;
	const USER_INTERACTION_KEY = 'bakaworld-user-interacted';
	let userHasInteracted = false; // Track if user has clicked play at least once
	let isNavigating = false; // Track if we're navigating to a new episode
	const USER_INACTIVITY_THRESHOLD = 30000; // 30 seconds
	const MIN_EPISODE_DURATION = 600000; // 10 minutes in milliseconds
	const CHECK_INTERVAL = 1000; // Check every 1 second for faster detection
	const AUTOPLAY_DELAY = 100; // 100ms minimal delay to ensure smooth transition

	// Get the embed URL from videoData
	$: embedUrl = videoData?.embedUrl || videoData?.sources?.[0]?.url;
	$: loading = !embedUrl;
	// Show loading when navigating (forward or backward) or when embedUrl is not available
	// Check both 'to' (forward nav) and 'from' (backward nav) to handle browser back button
	$: isNavigatingToEpisode = isNavigating || 
		($navigating !== null && (
			$navigating.to?.url.pathname.includes('/watch/') || 
			$navigating.from?.url.pathname.includes('/watch/')
		)) || 
		loading;
	
		// Reset autoplay tracking when embed URL changes
		$: if (embedUrl && autoplay && browser) {
			hasAdvanced = false;
			videoEndedListenerAdded = false;
			pageLoadTime = Date.now();
			lastUserActivity = Date.now();
		}
		
		// Reset navigating flag when embedUrl is available (episode loaded)
		$: if (embedUrl && isNavigating) {
			// Small delay to ensure smooth transition
			setTimeout(() => {
				isNavigating = false;
			}, 500);
		}

	// Block popups from iframe
	let iframeElement: HTMLIFrameElement;
	let popupBlocked = false;
	
	function setupPopupBlocker() {
		if (popupBlocked || !browser) return;
		popupBlocked = true;

		// Block window.open globally
		window.open = function(url?: string | URL, target?: string, features?: string) {
			console.log('Blocked popup attempt to:', url);
			return null;
		};

		// Block attempts to create new windows via various methods
		document.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			// Check if click is on or inside iframe
			if (iframeElement && (target === iframeElement || iframeElement.contains(target))) {
				// Prevent default might not work for iframe clicks, but we try
				e.stopPropagation();
			}
		}, true); // Use capture phase

		// Block beforeunload popups
		window.addEventListener('beforeunload', (e) => {
			// Only prevent if it's from an iframe interaction
			// We can't always detect this, so we're selective
		});

		// Monitor for window blur events that might indicate popup opened
		let lastBlurTime = 0;
		let isInteractingWithIframe = false;
		
		// Track if user is interacting with iframe
		if (iframeElement) {
			iframeElement.addEventListener('mouseenter', () => {
				isInteractingWithIframe = true;
			});
			iframeElement.addEventListener('mouseleave', () => {
				setTimeout(() => {
					isInteractingWithIframe = false;
				}, 500);
			});
		}

		window.addEventListener('blur', () => {
			if (isInteractingWithIframe) {
				lastBlurTime = Date.now();
				// Try to close any popup and focus back
				setTimeout(() => {
					window.focus();
					// Try to close any popup windows that might have opened
					if (window.opener) {
						try {
							window.close();
						} catch (e) {
							// Can't close, ignore
						}
					}
				}, 50);
			}
		});

		// Block target="_blank" links that might open new tabs (on parent page only)
		// Note: Can't block links inside iframe due to cross-origin restrictions
		document.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			// Only block links that are NOT inside the iframe (we can't access iframe content)
			if (iframeElement && target !== iframeElement && !iframeElement.contains(target)) {
				const link = target.closest('a[target="_blank"]') as HTMLAnchorElement;
				if (link) {
					// Only block if it's a suspicious popup link
					const href = link.href.toLowerCase();
					// Allow normal navigation, but could add filtering here if needed
				}
			}
		}, true);
	}

	function handleIframeLoad() {
		if (!iframeElement) return;
		
		// Ensure iframe is connected to DOM before proceeding
		if (!iframeElement.isConnected) {
			console.warn('Iframe not connected to DOM');
			return;
		}
		
		// Prevent auto-scroll when iframe receives focus - more aggressive approach
		let scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
		let isPreventingScroll = false;
		let scrollPreventionTimeout: ReturnType<typeof setTimeout> | null = null;
		
		// Store scroll position constantly
		const updateScrollPosition = () => {
			if (!isPreventingScroll) {
				scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
			}
		};
		
		// Continuously track scroll position (only update when not preventing)
		const scrollTracker = setInterval(updateScrollPosition, 50);
		
		// Override scrollIntoView completely
		Object.defineProperty(iframeElement, 'scrollIntoView', {
			value: function() {
				// Prevent automatic scrolling - do nothing
				return;
			},
			writable: false,
			configurable: false
		});

		// More aggressive scroll prevention
		const preventScrollOnFocus = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
			
			// Lock scroll position immediately
			scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
			isPreventingScroll = true;
			
			// Clear any existing timeout
			if (scrollPreventionTimeout) {
				clearTimeout(scrollPreventionTimeout);
			}
			
			// Restore scroll position multiple times to override browser behavior
			const restoreScroll = () => {
				window.scrollTo({
					top: scrollPosition,
					left: 0,
					behavior: 'auto'
				});
				document.documentElement.scrollTop = scrollPosition;
				document.body.scrollTop = scrollPosition;
			};
			
			// Restore immediately and repeatedly
			restoreScroll();
			requestAnimationFrame(restoreScroll);
			setTimeout(restoreScroll, 0);
			setTimeout(restoreScroll, 10);
			setTimeout(restoreScroll, 50);
			setTimeout(restoreScroll, 100);
			setTimeout(restoreScroll, 200);
			
			// Stop preventing after a longer period
			scrollPreventionTimeout = setTimeout(() => {
				isPreventingScroll = false;
				scrollPreventionTimeout = null;
			}, 500);
		};

		// Listen for all possible focus/click events on iframe and container
		iframeElement.addEventListener('focus', preventScrollOnFocus, true);
		iframeElement.addEventListener('focusin', preventScrollOnFocus, true);
		iframeElement.addEventListener('click', (e) => {
			// Preemptively save scroll position before click
			scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
		}, true);
		
		// Also prevent on mouse events that might trigger focus
		iframeElement.addEventListener('mousedown', () => {
			scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
		}, true);
		
		// Wrap iframe container to catch events before they reach iframe
		const videoContainer = iframeElement.parentElement;
		if (videoContainer) {
			videoContainer.addEventListener('click', (e) => {
				// Save scroll position before any click
				scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
				// Mark that user has interacted with the video player
				userHasInteracted = true;
				if (browser) {
					localStorage.setItem(USER_INTERACTION_KEY, 'true');
				}
			}, true);
			
			videoContainer.addEventListener('mousedown', (e) => {
				scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
				// Mark that user has interacted with the video player
				userHasInteracted = true;
				if (browser) {
					localStorage.setItem(USER_INTERACTION_KEY, 'true');
				}
			}, true);
		}

		// Aggressive scroll interception - prevent ALL scroll when iframe is active
		let lastKnownScroll = scrollPosition;
		scrollHandler = (e: Event) => {
			const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
			
			if (isPreventingScroll) {
				e.preventDefault();
				e.stopPropagation();
				window.scrollTo({
					top: scrollPosition,
					left: 0,
					behavior: 'auto'
				});
				document.documentElement.scrollTop = scrollPosition;
				document.body.scrollTop = scrollPosition;
				return false;
			} else if (document.activeElement === iframeElement || 
			           (iframeElement && iframeElement.contains(document.activeElement))) {
				// If iframe or any element inside it is focused, prevent scroll
				if (Math.abs(currentScroll - lastKnownScroll) > 1) {
					e.preventDefault();
					e.stopPropagation();
					window.scrollTo({
						top: lastKnownScroll,
						left: 0,
						behavior: 'auto'
					});
					document.documentElement.scrollTop = lastKnownScroll;
					document.body.scrollTop = lastKnownScroll;
					return false;
				}
			} else {
				lastKnownScroll = currentScroll;
			}
		};

		// Intercept scroll at multiple levels with high priority
		window.addEventListener('scroll', scrollHandler, { passive: false, capture: true });
		document.addEventListener('scroll', scrollHandler, { passive: false, capture: true });
		document.documentElement.addEventListener('scroll', scrollHandler, { passive: false, capture: true });
		
		// Also use a MutationObserver to detect scroll changes
		const scrollMutationObserver = new MutationObserver(() => {
			if (document.activeElement === iframeElement && isPreventingScroll) {
				window.scrollTo(0, scrollPosition);
			}
		});
		
		// Observe body for attribute changes that might indicate scroll
		if (document.body) {
			scrollMutationObserver.observe(document.body, {
				attributes: true,
				attributeFilter: ['style']
			});
		}
		
		// Clean up interval on destroy
		onDestroy(() => {
			if (scrollTracker) {
				clearInterval(scrollTracker);
			}
			if (scrollPreventionTimeout) {
				clearTimeout(scrollPreventionTimeout);
			}
		});
		
		setupPopupBlocker();

		// Try to access iframe content and block window.open
		try {
			// Try to inject script to block popups inside iframe (may fail due to CORS)
			const iframeWindow = iframeElement.contentWindow;
			if (iframeWindow) {
				try {
					// This will fail for cross-origin iframes, which is expected
					iframeWindow.open = function() {
						console.log('Blocked iframe popup attempt');
						return null;
					};
				} catch (e) {
					// Cross-origin restriction - can't access iframe content
					// This is normal and expected
				}
			}
		} catch (e) {
			// Cross-origin restriction - can't access iframe content
			// This is expected for cross-origin iframes
		}

		// Start monitoring iframe for autoplay
		if (autoplay) {
			setTimeout(() => {
				monitorIframe();
			}, 1000);
		}

		// If user has interacted and we're navigating (not first load), try to autoplay
		if (userHasInteracted && isNavigating) {
			setTimeout(() => {
				tryToAutoplayVideo();
			}, 1500); // Wait for iframe to fully load
		}
	}

	// Function to try to autoplay video when navigating between episodes
	function tryToAutoplayVideo() {
		if (!iframeElement || !userHasInteracted) return;

		try {
			// Try to access iframe content (may fail due to CORS)
			const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow?.document;
			if (iframeDoc) {
				// Try to find video element and play it
				const video = iframeDoc.querySelector('video');
				if (video) {
					video.play().catch((e) => {
						console.log('Autoplay prevented by browser:', e);
					});
					return;
				}
			}
		} catch (e) {
			// Cross-origin restriction - can't access iframe content directly
			// Try using postMessage instead
			try {
				const iframeWindow = iframeElement.contentWindow;
				if (iframeWindow) {
					// Send play command via postMessage (if iframe supports it)
					iframeWindow.postMessage({ action: 'play' }, '*');
					iframeWindow.postMessage({ command: 'play' }, '*');
					iframeWindow.postMessage({ type: 'play' }, '*');
				}
			} catch (err) {
				console.log('Could not send play command to iframe:', err);
			}
		}
	}
	
	// Store original window.open to restore later
	let originalWindowOpen: typeof window.open;
	
	// Listen for messages from iframe (if video player supports it)
	function handleMessage(event: MessageEvent) {
		// Check if message is from video player indicating video ended
		if (event.data) {
			const data = event.data;
			const dataStr = typeof data === 'string' ? data.toLowerCase() : '';
			const dataType = typeof data === 'object' ? (data.type || data.event || '').toLowerCase() : '';
			
			// Check various message formats that video players might use
			const isVideoEnded = 
				dataType === 'ended' || 
				dataType === 'video-ended' ||
				dataType === 'complete' ||
				dataStr.includes('ended') ||
				dataStr.includes('complete') ||
				(data && typeof data === 'object' && (data.state === 'ended' || data.status === 'ended'));

			if (isVideoEnded) {
				if (autoplay && canGoNext && !hasAdvanced) {
					hasAdvanced = true;
					setTimeout(() => {
						goToNextEpisode();
					}, AUTOPLAY_DELAY); // Small delay to ensure video has fully ended
				}
			}
		}
	}

	// Monitor iframe for changes that might indicate video ended
	function monitorIframe() {
		if (!iframeElement) return;

		try {
			// Watch for iframe src changes
			if (iframeElement.src !== lastIframeSrc) {
				lastIframeSrc = iframeElement.src;
				// Reset listener flag when iframe src changes
				videoEndedListenerAdded = false;
			}

			// Try to access iframe content (may fail due to CORS)
			if (!videoEndedListenerAdded) {
				try {
					const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow?.document;
					if (iframeDoc) {
						// Check for video element
						const video = iframeDoc.querySelector('video');
						if (video && !videoEndedListenerAdded) {
							// Listen for video ended event
							video.addEventListener('ended', () => {
								if (autoplay && canGoNext && !hasAdvanced) {
									hasAdvanced = true;
									setTimeout(() => {
										goToNextEpisode();
									}, AUTOPLAY_DELAY);
								}
							}, { once: true });
							videoEndedListenerAdded = true;
						}
					}
				} catch (e) {
					// CORS restriction - can't access iframe content
					// This is expected for cross-origin iframes
				}
			}
		} catch (e) {
			// Silently handle errors
		}
	}

	// Check if we should auto-advance to next episode
	function checkAutoplay() {
		if (!autoplay || !canGoNext) return;

		const now = Date.now();
		const timeSinceLoad = now - pageLoadTime;
		const timeSinceActivity = now - lastUserActivity;

		// Only auto-advance if:
		// 1. Minimum episode duration has passed (to avoid premature skipping)
		// 2. User has been inactive for a while (not actively watching)
		// 3. Page is visible (user hasn't switched tabs)
		if (
			timeSinceLoad >= MIN_EPISODE_DURATION &&
			timeSinceActivity >= USER_INACTIVITY_THRESHOLD &&
			document.visibilityState === 'visible'
		) {
			// This is a fallback - ideally the iframe will send a message when video ends
			// But since we can't reliably detect that, we'll let users manually advance
			// or wait for the message event
		}
	}

	function startAutoplayMonitoring() {
		if (autoplayCheckInterval) {
			clearInterval(autoplayCheckInterval);
		}
		
		if (autoplay && browser) {
			// Reset tracking
			hasAdvanced = false;
			pageLoadTime = Date.now();
			lastUserActivity = Date.now();

			// Monitor iframe
			if (iframeElement) {
				lastIframeSrc = iframeElement.src || '';
				monitorIframe();
			}

			// Set up interval to check autoplay conditions
			autoplayCheckInterval = setInterval(() => {
				checkAutoplay();
				monitorIframe();
			}, CHECK_INTERVAL);

			// Track user activity
			const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
			const updateActivity = () => {
				lastUserActivity = Date.now();
			};

			activityEvents.forEach(event => {
				window.addEventListener(event, updateActivity, { passive: true });
			});

			// Monitor iframe with MutationObserver
			if (iframeElement && iframeElement.isConnected) {
				try {
					iframeObserver = new MutationObserver(() => {
						monitorIframe();
					});

					iframeObserver.observe(iframeElement, {
						attributes: true,
						attributeFilter: ['src']
					});
				} catch (e) {
					console.warn('Failed to observe iframe:', e);
					// Clean up observer if it failed
					if (iframeObserver) {
						iframeObserver.disconnect();
						iframeObserver = null;
					}
				}
			}
		}
	}

	function stopAutoplayMonitoring() {
		if (autoplayCheckInterval) {
			clearInterval(autoplayCheckInterval);
			autoplayCheckInterval = null;
		}

		if (iframeObserver) {
			iframeObserver.disconnect();
			iframeObserver = null;
		}

		hasAdvanced = false;
		videoEndedListenerAdded = false;
	}

	onMount(() => {
		// Load user interaction status from localStorage
		if (browser) {
			const storedInteraction = localStorage.getItem(USER_INTERACTION_KEY);
			userHasInteracted = storedInteraction === 'true';
		}

		// Save original window.open
		originalWindowOpen = window.open;
		
		// Set up comprehensive popup blocking
		setupPopupBlocker();

		// Load preferences from localStorage
		if (browser) {
			const storedSkipFiller = localStorage.getItem(SKIP_FILLER_STORAGE_KEY);
			skipFiller = storedSkipFiller === 'true';
			skipFillerValue = skipFiller ? 'true' : 'false';

			const storedAutoplay = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
			autoplay = storedAutoplay === 'true';
			autoplayValue = autoplay ? 'true' : 'false';

			// Set up message listener for iframe communication
			window.addEventListener('message', handleMessage);

			// Start autoplay monitoring if enabled
			if (autoplay) {
				pageLoadTime = Date.now();
				lastUserActivity = Date.now();
				startAutoplayMonitoring();
			}
		}
	});
	
	onDestroy(() => {
		// Restore original window.open
		if (originalWindowOpen) {
			window.open = originalWindowOpen;
		}

		// Clean up autoplay monitoring
		stopAutoplayMonitoring();

		// Remove message listener
		if (browser) {
			window.removeEventListener('message', handleMessage);
		}

		// Remove scroll handler
		if (scrollHandler) {
			window.removeEventListener('scroll', scrollHandler, { capture: true });
			document.removeEventListener('scroll', scrollHandler, { capture: true });
			document.documentElement.removeEventListener('scroll', scrollHandler, { capture: true });
			scrollHandler = null;
		}
	});

	function navigateToEpisode(episode: any) {
		if (!episode) return;
		const episodeId = episode.id.replace(/\$/g, '-');
		isNavigating = true; // Mark that we're navigating
		goto(`/anime/${animeId}/watch/${episodeId}?language=${selectedLanguage}`);
	}

	function findNextNonFillerEpisode(currentIndex: number, direction: 'next' | 'prev'): any {
		if (!anime?.episodes || currentIndex < 0) return null;
		
		const episodes = anime.episodes;
		const step = direction === 'next' ? 1 : -1;
		let index = currentIndex + step;
		
		while (index >= 0 && index < episodes.length) {
			const ep = episodes[index];
			if (!ep.isFiller) {
				return ep;
			}
			index += step;
		}
		
		return null;
	}

	function goToNextEpisode() {
		if (skipFiller && anime?.episodes) {
			const currentIndex = anime.episodes.findIndex((ep: any) => 
				ep.id.replace(/\$/g, '-') === episodeId
			);
			const nextNonFiller = findNextNonFillerEpisode(currentIndex, 'next');
			if (nextNonFiller) {
				navigateToEpisode(nextNonFiller);
				return;
			}
		}
		navigateToEpisode(nextEpisode);
	}

	function goToPrevEpisode() {
		if (skipFiller && anime?.episodes) {
			const currentIndex = anime.episodes.findIndex((ep: any) => 
				ep.id.replace(/\$/g, '-') === episodeId
			);
			const prevNonFiller = findNextNonFillerEpisode(currentIndex, 'prev');
			if (prevNonFiller) {
				navigateToEpisode(prevNonFiller);
				return;
			}
		}
		navigateToEpisode(prevEpisode);
	}

	function changeSkipFiller(value: string) {
		skipFiller = value === 'true';
		if (browser) {
			localStorage.setItem(SKIP_FILLER_STORAGE_KEY, skipFiller.toString());
		}
	}

	function changeAutoplay(value: string) {
		const wasEnabled = autoplay;
		autoplay = value === 'true';
		autoplayValue = value;
		
		if (browser) {
			localStorage.setItem(AUTOPLAY_STORAGE_KEY, autoplay.toString());
		}

		// Start or stop monitoring based on new value
		if (autoplay && !wasEnabled) {
			pageLoadTime = Date.now();
			lastUserActivity = Date.now();
			startAutoplayMonitoring();
		} else if (!autoplay && wasEnabled) {
			stopAutoplayMonitoring();
		}
	}

	function changeLanguage(newLanguage: string) {
		selectedLanguage = newLanguage;
		goto(`/anime/${animeId}/watch/${episodeId}?language=${newLanguage}`);
	}

	// Computed values for button states when skip filler is enabled
	let canGoNext = !!nextEpisode;
	let canGoPrev = !!prevEpisode;
	
	$: {
		if (skipFiller && anime?.episodes) {
			const currentIndex = anime.episodes.findIndex((ep: any) => 
				ep.id.replace(/\$/g, '-') === episodeId
			);
			canGoNext = findNextNonFillerEpisode(currentIndex, 'next') !== null;
			canGoPrev = findNextNonFillerEpisode(currentIndex, 'prev') !== null;
		} else {
			canGoNext = !!nextEpisode;
			canGoPrev = !!prevEpisode;
		}

		// Reset autoplay tracking when episode changes
		hasAdvanced = false;
		videoEndedListenerAdded = false;
		if (autoplay && browser) {
			pageLoadTime = Date.now();
			lastUserActivity = Date.now();
			// Restart monitoring if it was stopped
			if (!autoplayCheckInterval) {
				startAutoplayMonitoring();
			}
		}
	}
</script>

<svelte:head>
	<title>{episode.title} - {anime.title} - BakaWorld X</title>
	<meta name="description" content="Watch {episode.title} from {anime.title}" />
</svelte:head>

<div class="theme-bg-primary">
	<!-- Video Player -->
	<div class="relative w-full" style="padding-top: 56.25%;">
		{#if isNavigatingToEpisode}
			<!-- Loading Overlay -->
			<div class="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-95 z-50">
				<div class="text-center">
					<!-- Spinner -->
					<div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-600 border-t-blue-500 mb-4"></div>
					<p class="text-white text-lg font-medium">Loading...</p>
					<p class="text-gray-400 text-sm mt-2">Please wait</p>
				</div>
			</div>
		{:else if embedUrl}
			<iframe
				bind:this={iframeElement}
				src={embedUrl}
				class="absolute top-0 left-0 w-full h-full"
				frameborder="0"
				scrolling="no"
				allowfullscreen
				title="Video Player"
				onload={handleIframeLoad}
				referrerpolicy="no-referrer-when-downgrade"
				sandbox="allow-scripts allow-same-origin"
				tabindex="-1"
			></iframe>
		{:else}
			<div class="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900">
				<div class="max-w-lg text-center p-8">
					<div class="mb-4 text-xl text-red-400">
						Unable to load video
					</div>
					<p class="text-gray-400 mb-4">
						The video source could not be loaded. Please try again later.
					</p>
			<button
				class="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
				onclick={() => window.location.reload()}
			>
				Reload Page
			</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Controls -->
	<div class="container mx-auto max-w-6xl px-4 py-6">
		<!-- Episode Info -->
		<div class="mb-6">
			<h1 class="mb-2 text-2xl font-bold text-white">
				{anime.title} - Episode {episode.number}
			</h1>
			<h2 class="text-lg text-gray-400">{episode.title}</h2>
		</div>

		<!-- Language Selection and Skip Filler Toggle -->
		<div class="mb-6 flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label for="language-select" class="text-sm font-medium text-white">Language:</label>
				<select
					id="language-select"
					bind:value={selectedLanguage}
					onchange={(e) => changeLanguage(e.currentTarget.value)}
					class="select-dropdown rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 pr-10 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					{#each languages as langOption}
						<option value={langOption.name}>{langOption.label}</option>
					{/each}
				</select>
			</div>

			<!-- Skip Filler Dropdown -->
			<div class="flex items-center gap-2">
				<label for="skip-filler-select" class="text-sm font-medium text-white">Skip Filler:</label>
				<select
					id="skip-filler-select"
					bind:value={skipFillerValue}
					onchange={() => changeSkipFiller(skipFillerValue)}
					class="select-dropdown rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 pr-10 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					{#each skipFillerOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- Autoplay Dropdown -->
			<div class="flex items-center gap-2">
				<label for="autoplay-select" class="text-sm font-medium text-white">Autoplay:</label>
				<select
					id="autoplay-select"
					bind:value={autoplayValue}
					onchange={() => changeAutoplay(autoplayValue)}
					class="select-dropdown rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 pr-10 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					{#each autoplayOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Navigation -->
		<div class="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
			<button
				onclick={goToPrevEpisode}
				disabled={!canGoPrev}
				class="rounded-lg bg-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-white hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer"
			>
				<span class="mr-1 sm:mr-1.5 text-base sm:text-lg font-semibold">◀</span> Previous
			</button>

			<button
				onclick={goToNextEpisode}
				disabled={!canGoNext}
				class="rounded-lg bg-blue-600 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-white hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer"
			>
				Next <span class="ml-1 sm:ml-1.5 text-base sm:text-lg font-semibold">▶</span>
			</button>

			<a
				href="/anime/{animeId}"
				class="rounded-lg bg-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-white hover:bg-gray-600 text-center"
			>
				<span class="mr-1 sm:mr-1.5 text-base sm:text-lg font-semibold">◀</span> Back to Episodes
			</a>
		</div>
	</div>
</div>

<style>
	/* Custom styling for select dropdown arrows - bright white for visibility */
	.select-dropdown {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%23ffffff' fill-opacity='1' stroke='none' d='M7 10.5L1.5 5h11z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 14px 14px;
	}

	.select-dropdown:disabled {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%239ca3af' fill-opacity='1' stroke='none' d='M7 10.5L1.5 5h11z'/%3E%3C/svg%3E");
	}

	.select-dropdown:hover {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%23ffffff' fill-opacity='1' stroke='none' d='M7 10.5L1.5 5h11z'/%3E%3C/svg%3E");
	}

	/* Prevent scroll behavior on iframe focus */
	iframe {
		scroll-margin: 0 !important;
		scroll-padding: 0 !important;
	}

	/* Prevent smooth scrolling to iframe */
	:global(html) {
		scroll-behavior: auto !important;
	}
</style>
