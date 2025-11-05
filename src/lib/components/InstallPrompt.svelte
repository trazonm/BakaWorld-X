<!-- PWA Install Prompt Component -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let deferredPrompt: BeforeInstallPromptEvent | null = null;
	let showBanner = $state(false);
	let isIOS = false;
	let isInstalled = false;

	// Check if app is already installed
	function checkIfInstalled() {
		if (!browser) return false;
		
		// Check if running in standalone mode (PWA installed)
		if (window.matchMedia('(display-mode: standalone)').matches) {
			return true;
		}
		
		// Check for iOS standalone mode
		if ((window.navigator as any).standalone === true) {
			return true;
		}
		
		return false;
	}

	// Check if user has dismissed the prompt before
	function hasUserDismissed() {
		if (!browser) return false;
		return localStorage.getItem('pwa-install-dismissed') === 'true';
	}

	// Dismiss the banner
	function dismissBanner() {
		showBanner = false;
		if (browser) {
			localStorage.setItem('pwa-install-dismissed', 'true');
		}
	}

	// Handle install button click
	async function handleInstall() {
		if (!deferredPrompt) {
			// For iOS, show instructions
			if (isIOS) {
				alert('To install this app:\n1. Tap the Share button\n2. Select "Add to Home Screen"\n3. Tap "Add"');
			}
			return;
		}

		// Show the install prompt
		deferredPrompt.prompt();

		// Wait for the user's response
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			console.log('User accepted the install prompt');
		} else {
			console.log('User dismissed the install prompt');
		}

		// Clear the deferred prompt
		deferredPrompt = null;
		showBanner = false;
	}

	onMount(() => {
		if (!browser) return;

		// Check if already installed
		isInstalled = checkIfInstalled();
		if (isInstalled) return;

		// Check if user dismissed before
		if (hasUserDismissed()) return;

		// Detect iOS
		isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

		// Listen for the beforeinstallprompt event
		const handleBeforeInstallPrompt = (e: Event) => {
			// Prevent the mini-infobar from appearing
			e.preventDefault();
			// Store the event so it can be triggered later
			deferredPrompt = e as BeforeInstallPromptEvent;
			// Show our custom banner immediately when event fires
			showBanner = true;
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		// For iOS, always show after delay (beforeinstallprompt doesn't fire on iOS)
		if (isIOS) {
			setTimeout(() => {
				if (!isInstalled && !hasUserDismissed()) {
					showBanner = true;
				}
			}, 3000);
		} else {
			// For Android/Chrome, wait a bit and check if event fired
			// If not, show banner anyway (browser might show install option in menu)
			setTimeout(() => {
				if (!isInstalled && !hasUserDismissed() && !showBanner) {
					// Check if service worker is registered (indicates PWA capability)
					if ('serviceWorker' in navigator) {
						navigator.serviceWorker.getRegistration().then((registration) => {
							if (registration) {
								// Service worker is registered, show banner even if beforeinstallprompt didn't fire
								// This handles cases where the browser hasn't triggered the event yet
								showBanner = true;
							}
						});
					}
				}
			}, 5000); // Wait 5 seconds for service worker to register and event to potentially fire
		}

		// Listen for app installed event
		window.addEventListener('appinstalled', () => {
			console.log('PWA was installed');
			deferredPrompt = null;
			showBanner = false;
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	});
</script>

{#if showBanner && !isInstalled}
	<div 
		class="install-banner fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-gradient-to-r from-blue-900/95 to-blue-800/95 backdrop-blur-sm border-t border-blue-700 shadow-2xl"
		role="banner"
		aria-label="Install app prompt"
	>
		<div class="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-3 flex-1">
				<!-- Install icon -->
				<div class="flex-shrink-0 w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
				</div>
				<div class="flex-1">
					<h3 class="text-white font-semibold text-sm sm:text-base">Install BakaWorld X</h3>
					<p class="text-blue-100 text-xs sm:text-sm">
						{isIOS 
							? 'Add to your home screen for quick access'
							: 'Get the full app experience with offline access'}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={handleInstall}
					class="px-4 py-2 bg-white text-blue-900 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base min-h-[44px] touch-manipulation shadow-lg"
					aria-label="Install app"
				>
					Install
				</button>
				<button
					type="button"
					onclick={dismissBanner}
					class="p-2 text-blue-100 hover:text-white hover:bg-blue-700/50 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
					aria-label="Dismiss"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slideUp {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	:global(.install-banner) {
		animation: slideUp 0.3s ease-out;
	}
</style>
