// Input validation schemas and utilities
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export function validateSearchQuery(query: string): ValidationResult {
	const errors: string[] = [];
	
	if (!query || query.trim().length === 0) {
		errors.push('Search query is required');
	}
	
	if (query.trim().length < 2) {
		errors.push('Search query must be at least 2 characters');
	}
	
	if (query.length > 100) {
		errors.push('Search query must be less than 100 characters');
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}

export function validateTorrentId(id: string): ValidationResult {
	const errors: string[] = [];
	
	if (!id || id.trim().length === 0) {
		errors.push('Torrent ID is required');
	}
	
	// Basic format check (adjust based on your torrent service)
	if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
		errors.push('Invalid torrent ID format');
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}

export function validateDownloadData(data: any): ValidationResult {
	const errors: string[] = [];
	
	if (!data.id) {
		errors.push('Download ID is required');
	}
	
	if (!data.filename || typeof data.filename !== 'string') {
		errors.push('Valid filename is required');
	}
	
	if (typeof data.progress !== 'number' || data.progress < 0 || data.progress > 100) {
		errors.push('Progress must be a number between 0 and 100');
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}
