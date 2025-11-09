// Application configuration
import { dev } from '$app/environment';

export const config = {
	app: {
		name: 'BakaWorld χ',
		version: '1.0.0',
		description: 'Modern torrent search and download manager'
	},
	api: {
		baseUrl: dev ? 'http://localhost:5173' : '',
		timeout: 30000, // 30 seconds
		retryAttempts: 3
	},
	consumet: {
		baseUrl: 'http://192.168.0.107:6000',
		defaultAnimeProvider: 'zoro',
		defaultMangaProvider: 'mangadex'
	},
	comicVine: {
		baseUrl: 'https://comicvine.gamespot.com/api'
	},
	realDebrid: {
		apiBase: 'https://api.real-debrid.com/rest/1.0'
	},
	torrent: {
		maxConcurrentDownloads: 5,
		pollInterval: 2000,
		timeoutDuration: 300000 // 5 minutes
	},
	ui: {
		pageSize: 50,
		animationDuration: 300,
		toastDuration: 5000
	},
	features: {
		enableAutoRefresh: true,
		enableNotifications: true,
		enableAnalytics: false
	}
} as const;

export type AppConfig = typeof config;
