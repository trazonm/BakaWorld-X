// Formatting utilities
import { FILE_SIZE_UNITS, SPEED_UNITS } from '$lib/constants';

export function formatSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	
	const k = 1024;
	const sizes = FILE_SIZE_UNITS;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatSpeed(speed?: number): string {
	if (!speed || speed <= 0) return '—';
	
	const k = 1024;
	const units = SPEED_UNITS;
	const i = Math.floor(Math.log(speed) / Math.log(k));
	
	return `${parseFloat((speed / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}

export function formatProgress(progress: number): string {
	return `${Math.round(Math.max(0, Math.min(100, progress)))}%`;
}

export function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(d);
}
