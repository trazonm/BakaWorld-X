import { writable } from 'svelte/store';

export interface RowStatus {
	state: 'idle' | 'adding' | 'progress' | 'done' | 'error';
	guid: string;
	progress?: number; // Progress from database (updated by worker)
}

export const rowStatusStore = writable<Record<string, RowStatus>>({});
export const showResultsStore = writable<boolean>(false);
