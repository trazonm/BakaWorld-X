// Application configuration
import { dev } from '$app/environment';

export const config = {
	app: {
		name: 'BakaWorld X',
		version: '1.0.0',
		description: 'Modern torrent search and download manager'
	},
	api: {
		baseUrl: dev ? 'http://localhost:5173' : '',
		timeout: 30000, // 30 seconds
		retryAttempts: 3
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
