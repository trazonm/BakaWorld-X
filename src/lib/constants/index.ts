// Application constants
export const API_ENDPOINTS = {
	SEARCH: '/api/search',
	DOWNLOADS: '/api/downloads',
	TORRENTS: '/api/torrents',
	AUTH: '/api/auth'
} as const;

export const POLLING_INTERVAL = 2000; // 2 seconds

export const COOKIE_CONFIG = {
	NAME: 'session',
	MAX_AGE: 60 * 60 * 24 * 7, // 7 days
	OPTIONS: {
		httpOnly: true,
		secure: true,
		sameSite: 'strict' as const,
		path: '/'
	}
} as const;

export const UI_CONFIG = {
	MODAL_ANIMATION_DURATION: 300,
	TABLE_PAGE_SIZE: 50,
	PROGRESS_UPDATE_INTERVAL: 2000
} as const;

export const TORRENT_STATES = {
	IDLE: 'idle',
	ADDING: 'adding',
	PROGRESS: 'progress',
	DONE: 'done',
	ERROR: 'error'
} as const;

export const FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;
export const SPEED_UNITS = ['B/s', 'KB/s', 'MB/s', 'GB/s'] as const;
