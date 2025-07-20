// Data manipulation utilities
import type { SearchResult } from '$lib/types';

export function getRowKey(result: { id?: string; Guid?: string; Title?: string; Size?: number }): string {
	return result.id || result.Guid || `${result.Title}-${result.Size}` || '';
}

export function sortSearchResults<T extends SearchResult>(
	results: T[],
	key: keyof T,
	direction: 'asc' | 'desc'
): T[] {
	return [...results].sort((a, b) => {
		let aVal: any = a[key];
		let bVal: any = b[key];
		
		// Handle numeric sorting for Size and Seeders
		if (key === 'Size' || key === 'Seeders') {
			aVal = parseFloat(String(aVal)) || 0;
			bVal = parseFloat(String(bVal)) || 0;
		}
		
		if (aVal < bVal) return direction === 'asc' ? -1 : 1;
		if (aVal > bVal) return direction === 'asc' ? 1 : -1;
		return 0;
	});
}

export function filterSearchResults<T extends SearchResult>(
	results: T[],
	searchTerm: string
): T[] {
	if (!searchTerm.trim()) return results;
	
	const term = searchTerm.toLowerCase().trim();
	return results.filter(result => 
		result.Title?.toLowerCase().includes(term)
	);
}

export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
	return array.reduce((groups, item) => {
		const key = keyFn(item);
		groups[key] = groups[key] || [];
		groups[key].push(item);
		return groups;
	}, {} as Record<string, T[]>);
}

export function unique<T>(array: T[], keyFn?: (item: T) => any): T[] {
	if (!keyFn) {
		return [...new Set(array)];
	}
	
	const seen = new Set();
	return array.filter(item => {
		const key = keyFn(item);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

export function chunk<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}
