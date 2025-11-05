// Theme store for managing dark mode and midnight theme
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'midnight';

const THEME_STORAGE_KEY = 'bakaworld-theme';
const AUDIO_MUTED_KEY = 'bakaworld-audio-muted';
let midnightAudio: HTMLAudioElement | null = null;
let audioSource: MediaElementAudioSourceNode | null = null;
let audioContext: AudioContext | null = null;
let audioPlayAttempted = false;

// Create a writable store for mute state
const createMuteStore = () => {
	const { subscribe, set } = writable<boolean>(false);
	
	return {
		subscribe,
		set: (value: boolean) => {
			if (browser) {
				localStorage.setItem(AUDIO_MUTED_KEY, value.toString());
			}
			set(value);
		},
		get: () => {
			if (!browser) return false;
			const stored = localStorage.getItem(AUDIO_MUTED_KEY);
			return stored === 'true';
		}
	};
};

export const audioMuted = createMuteStore();

// Default to dark theme
const getInitialTheme = (): Theme => {
	if (!browser) return 'dark';
	
	const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
	if (stored === 'dark' || stored === 'midnight') {
		return stored;
	}
	return 'dark';
};

// Play midnight theme audio
function playMidnightAudio() {
	if (!browser) return;
	
	// Check if muted by reading from localStorage directly
	const muted = audioMuted.get();
	if (muted) return;
	
	try {
		// Initialize audio if not already created
		if (!midnightAudio) {
			midnightAudio = new Audio('/01 - 360.flac');
			midnightAudio.loop = true;
			midnightAudio.volume = 0.5; // Set volume to 50%
			
			// Handle audio loading errors
			midnightAudio.addEventListener('error', (e) => {
				console.warn('Could not load midnight theme audio:', e);
			});
		}
		
		// Only try to play if not already playing
		if (midnightAudio.paused) {
			// Play audio
			const playPromise = midnightAudio.play();
			
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						// Audio started playing successfully
						audioPlayAttempted = true;
					})
					.catch((error) => {
						// Autoplay was prevented - this is normal for browsers
						// We'll try again on user interaction
						console.log('Autoplay prevented, will play on user interaction:', error);
						audioPlayAttempted = false;
						
						// Set up user interaction listeners to resume audio
						setupAudioResumeListeners();
					});
			}
		} else {
			// Already playing, just mark as attempted
			audioPlayAttempted = true;
		}
	} catch (error) {
		console.warn('Error setting up midnight theme audio:', error);
	}
}

// Toggle mute state
function toggleMute() {
	if (!browser) return;
	
	const currentMuted = audioMuted.get();
	const newMuted = !currentMuted;
	audioMuted.set(newMuted);
	
	// Apply mute state to audio
	if (midnightAudio) {
		if (newMuted) {
			midnightAudio.pause();
		} else {
			// Resume playing if midnight mode is active
			if (document.documentElement.getAttribute('data-theme') === 'midnight') {
				audioPlayAttempted = false; // Reset so we can try to play again
				playMidnightAudio();
			}
		}
	}
	
	return newMuted;
}

// Set up listeners to resume audio after user interaction (for autoplay policies)
function setupAudioResumeListeners() {
	if (!browser || !midnightAudio || audioPlayAttempted) return;
	
	// Don't set up listeners if muted
	const muted = audioMuted.get();
	if (muted) return;
	
	const resumeAudio = () => {
		// Check again if muted before trying to play
		const stillMuted = audioMuted.get();
		if (stillMuted) {
			// Remove listeners if muted
			document.removeEventListener('click', resumeAudio);
			document.removeEventListener('keydown', resumeAudio);
			document.removeEventListener('touchstart', resumeAudio);
			return;
		}
		
		if (midnightAudio && !audioPlayAttempted) {
			midnightAudio.play()
				.then(() => {
					audioPlayAttempted = true;
					// Remove listeners once audio starts playing
					document.removeEventListener('click', resumeAudio);
					document.removeEventListener('keydown', resumeAudio);
					document.removeEventListener('touchstart', resumeAudio);
				})
				.catch(() => {
					// Still blocked, keep listeners
				});
		}
	};
	
	// Try to resume on any user interaction
	document.addEventListener('click', resumeAudio, { once: true });
	document.addEventListener('keydown', resumeAudio, { once: true });
	document.addEventListener('touchstart', resumeAudio, { once: true });
}

// Stop midnight theme audio
function stopMidnightAudio() {
	if (!browser || !midnightAudio) return;
	
	try {
		midnightAudio.pause();
		midnightAudio.currentTime = 0;
		audioPlayAttempted = false; // Reset so it can play again when switching back
	} catch (error) {
		console.warn('Error stopping midnight theme audio:', error);
	}
}

// Update meta tags for PWA status bar colors
function updateThemeMetaTags(theme: Theme) {
	if (!browser) return;
	
	let themeColor: string;
	let statusBarStyle: string;
	
	if (theme === 'midnight') {
		themeColor = '#000000'; // Pure black for midnight
		statusBarStyle = 'black'; // Solid black status bar
	} else {
		themeColor = '#0f172a'; // slate-900 for dark theme (matches background)
		statusBarStyle = 'black-translucent'; // Translucent for dark theme
	}
	
	// Update theme-color meta tag
	let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
	if (!themeColorMeta) {
		themeColorMeta = document.createElement('meta');
		themeColorMeta.name = 'theme-color';
		document.head.appendChild(themeColorMeta);
	}
	themeColorMeta.content = themeColor;
	
	// Update Apple status bar style
	let appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
	if (!appleStatusBarMeta) {
		appleStatusBarMeta = document.createElement('meta');
		appleStatusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
		document.head.appendChild(appleStatusBarMeta);
	}
	appleStatusBarMeta.content = statusBarStyle;
}

function createThemeStore() {
	const { subscribe, set: setStore, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		set: (newTheme: Theme) => {
			if (browser) {
				// Stop audio if switching away from midnight
				if (newTheme !== 'midnight') {
					stopMidnightAudio();
				}
				
				localStorage.setItem(THEME_STORAGE_KEY, newTheme);
				document.documentElement.setAttribute('data-theme', newTheme);
				updateThemeMetaTags(newTheme);
				
				// Play audio if switching to midnight
				if (newTheme === 'midnight') {
					playMidnightAudio();
				}
			}
			setStore(newTheme);
		},
		toggle: () => {
			update((current) => {
				const next = current === 'dark' ? 'midnight' : 'dark';
				if (browser) {
					// Stop audio if switching away from midnight
					if (next !== 'midnight') {
						stopMidnightAudio();
					}
					
					localStorage.setItem(THEME_STORAGE_KEY, next);
					document.documentElement.setAttribute('data-theme', next);
					updateThemeMetaTags(next);
					
					// Play audio if switching to midnight
					if (next === 'midnight') {
						playMidnightAudio();
					}
				}
				return next;
			});
		},
		init: () => {
			if (browser) {
				const initialTheme = getInitialTheme();
				// Load mute state from localStorage
				const muted = audioMuted.get();
				audioMuted.set(muted);
				
				document.documentElement.setAttribute('data-theme', initialTheme);
				updateThemeMetaTags(initialTheme);
				
				// Set the store value directly (without triggering our custom set function)
				setStore(initialTheme);
				
				// Play audio if initial theme is midnight and not muted (after setting store)
				if (initialTheme === 'midnight' && !muted) {
					// Try to play immediately, but if blocked by autoplay policy,
					// it will resume on first user interaction
					playMidnightAudio();
				}
			}
		},
		toggleMute: () => toggleMute(),
		getAudio: () => midnightAudio,
		getAudioSource: () => audioSource,
		setAudioSource: (source: MediaElementAudioSourceNode | null) => {
			audioSource = source;
		},
		getAudioContext: () => audioContext,
		setAudioContext: (context: AudioContext | null) => {
			audioContext = context;
		}
	};
}

export const theme = createThemeStore();

