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
		defaultAnimeProvider: 'animekai',
		defaultMangaProvider: 'mangadex'
	},
	/** [Aniwatch-Api](https://github.com/codex0555/Aniwatch-Api) — search + episodes + `?ep=` ids for MegaPlay `s-2`. */
	aniwatch: {
		baseUrl: 'https://aniwatch-api-v1-0.onrender.com'
	},
	/** When MAL or AniList id + episode number are known, embed MegaPlay instead of Consumet watch (more reliable for many titles). */
	megaplay: {
		baseUrl: 'https://megaplay.buzz',
		useMetaEmbedWhenAvailable: true
	},
	/** Per-episode filler flags from https://filler-list.chaiwala-anime.workers.dev/{slug} */
	fillerList: {
		baseUrl: 'https://filler-list.chaiwala-anime.workers.dev',
		enabled: true
	},
	comicVine: {
		baseUrl: 'https://comicvine.gamespot.com/api'
	},
	realDebrid: {
		apiBase: 'https://api.real-debrid.com/rest/1.0'
	},
	torrent: {
		maxConcurrentDownloads: 5,
		pollInterval: 1000,
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
