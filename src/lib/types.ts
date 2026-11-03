// Shared types for the application
export interface SearchResult {
	id?: string;
	Guid: string;
	Title: string;
	Size: number;
	Seeders: number;
	Link: string;
	MagnetUri?: string;
	protocol?: 'torrent' | 'usenet';
	indexer?: string;
	indexerId?: number;
	grab?: Record<string, unknown>;
}

export interface RowStatus {
	state: 'idle' | 'adding' | 'progress' | 'done' | 'error';
	guid: string;
	progress?: number; // Progress from database (updated by worker)
	error?: string;
	protocol?: 'torrent' | 'usenet';
}

export interface Download {
	id: string;
	filename: string;
	progress: number;
	status?: string;
	link?: string;
	linkError?: string;
	seeders?: number;
	speed?: number;
	protocol?: string;
	pollAfter?: number;
	healAfter?: number;
}

export interface TorrentInfo {
	id: string;
	filename: string;
	progress: number;
	status: string;
	links: string[];
	seeders?: number;
	speed?: number;
}

export interface User {
	id: string;
	username: string;
	email?: string;
}

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export type SortKey = 'Title' | 'Size' | 'Seeders';
export type SortDirection = 'asc' | 'desc';
