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

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		set: (newTheme: Theme) => {
			if (browser) {
				localStorage.setItem(THEME_STORAGE_KEY, newTheme);
				document.documentElement.setAttribute('data-theme', newTheme);
			}
			set(newTheme);
		},
		toggle: () => {
			update((current) => {
				const next = current === 'dark' ? 'midnight' : 'dark';
				if (browser) {
					localStorage.setItem(THEME_STORAGE_KEY, next);
					document.documentElement.setAttribute('data-theme', next);
				}
				return next;
			});
		},
		init: () => {
			if (browser) {
				const initialTheme = getInitialTheme();
				document.documentElement.setAttribute('data-theme', initialTheme);
				set(initialTheme);
			}
		}
	};
}

export const theme = createThemeStore();

