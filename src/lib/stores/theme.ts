// Theme store for managing dark mode and midnight theme
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'midnight';

const THEME_STORAGE_KEY = 'bakaworld-theme';

// Default to dark theme
const getInitialTheme = (): Theme => {
	if (!browser) return 'dark';
	
	const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
	if (stored === 'dark' || stored === 'midnight') {
		return stored;
	}
	return 'dark';
};

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
	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		set: (newTheme: Theme) => {
			if (browser) {
				localStorage.setItem(THEME_STORAGE_KEY, newTheme);
				document.documentElement.setAttribute('data-theme', newTheme);
				updateThemeMetaTags(newTheme);
			}
			set(newTheme);
		},
		toggle: () => {
			update((current) => {
				const next = current === 'dark' ? 'midnight' : 'dark';
				if (browser) {
					localStorage.setItem(THEME_STORAGE_KEY, next);
					document.documentElement.setAttribute('data-theme', next);
					updateThemeMetaTags(next);
				}
				return next;
			});
		},
		init: () => {
			if (browser) {
				const initialTheme = getInitialTheme();
				document.documentElement.setAttribute('data-theme', initialTheme);
				updateThemeMetaTags(initialTheme);
				set(initialTheme);
			}
		}
	};
}

export const theme = createThemeStore();

