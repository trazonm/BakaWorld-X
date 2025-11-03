// Centralized Real-Debrid API service
// Note: REAL_DEBRID_AUTH should be passed when creating the service instance

const REAL_DEBRID_API_BASE = 'https://api.real-debrid.com/rest/1.0';

export interface RealDebridTorrent {
	id: string;
	filename: string;
	hash: string;
	bytes: number;
	host: string;
	split: number;
	progress: number;
	status: string;
	added: string;
	links?: string[];
	speed?: number;
	seeders?: number;
}

export interface RealDebridUnrestrictResponse {
	id: string;
	filename: string;
	mimeType: string;
	filesize: number;
	link: string;
	host: string;
	chunks: number;
	download: string;
	streamable: number;
}

export interface RealDebridError {
	error: string;
	error_code?: number;
}

/**
 * Custom error for when a torrent resource doesn't exist (error_code 7)
 */
export class UnknownResourceError extends Error {
	constructor(message: string = 'Resource not found') {
		super(message);
		this.name = 'UnknownResourceError';
	}
}

export class RealDebridService {
	private authToken: string;
	private requestTimestamps: number[] = []; // Track requests for rate limiting

	constructor(authToken?: string) {
		this.authToken = authToken || '';
	}

	/**
	 * Track API requests to stay within 250 requests/minute limit
	 */
	private async checkRateLimit(): Promise<void> {
		const now = Date.now();
		const oneMinuteAgo = now - 60000;
		
		// Remove requests older than 1 minute
		this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
		
		// If we're close to the limit (240 requests), wait a bit
		if (this.requestTimestamps.length >= 240) {
			const oldestRequest = Math.min(...this.requestTimestamps);
			const waitTime = 60000 - (now - oldestRequest) + 1000; // Wait until oldest request is 1 minute old + 1 second buffer
			if (waitTime > 0) {
				console.warn(`Approaching rate limit (${this.requestTimestamps.length}/250 requests). Waiting ${Math.ceil(waitTime/1000)}s...`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}
		}
		
		// Track this request
		this.requestTimestamps.push(Date.now());
	}

	private getHeaders(): Record<string, string> {
		return {
			'Authorization': `Bearer ${this.authToken}`
		};
	}

	/**
	 * Check for rate limiting in response and handle retries
	 */
	private async handleRateLimit<T>(
		fetchFn: () => Promise<Response>,
		retries = 3,
		baseDelay = 1000
	): Promise<T> {
		// Pre-check rate limit before making request
		await this.checkRateLimit();

		for (let attempt = 0; attempt <= retries; attempt++) {
			const response = await fetchFn();
			
			// Handle empty responses (204 No Content, 304 Not Modified)
			if (response.status === 204 || response.status === 304) {
				return undefined as T;
			}

			// Clone response for potential retries, but read text once
			const text = await response.text();
			
			// Try to parse JSON, but handle empty responses
			let result: any = {};
			if (text) {
				try {
					result = JSON.parse(text);
				} catch (e) {
					// If JSON parsing fails and response is not OK, use text as error
					if (!response.ok) {
						throw new Error(text || `API request failed with status ${response.status}`);
					}
					// If OK but not JSON, return empty object
					result = {};
				}
			}

			// Check for rate limiting (HTTP 429 or error code 34)
			if (response.status === 429 || (result as RealDebridError).error_code === 34) {
				if (attempt < retries) {
					const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
					console.warn(`Rate limit hit (attempt ${attempt + 1}/${retries + 1}), waiting ${Math.ceil(delay/1000)}s...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				} else {
					throw new Error('Rate limit exceeded. Please wait before making more requests.');
				}
			}

			// Check for unknown resource (error_code 7 or error containing "unknown_ressource")
			const errorCode = (result as RealDebridError).error_code;
			const errorMsg = (result as RealDebridError).error?.toLowerCase() || '';
			if (errorCode === 7 || errorMsg.includes('unknown_ressource') || errorMsg.includes('unknown_resource')) {
				throw new UnknownResourceError((result as RealDebridError).error || 'Resource not found');
			}

			if (!response.ok) {
				throw new Error((result as RealDebridError).error || `API request failed with status ${response.status}`);
			}

			return result as T;
		}

		throw new Error('Failed after retries');
	}

	/**
	 * Add a magnet link to Real-Debrid
	 */
	async addMagnet(magnetLink: string): Promise<RealDebridTorrent> {
		if (!magnetLink.startsWith('magnet:')) {
			throw new Error('Invalid magnet link');
		}

		const data = new URLSearchParams({ magnet: magnetLink });
		const result = await this.handleRateLimit<RealDebridTorrent>(() =>
			fetch(`${REAL_DEBRID_API_BASE}/torrents/addMagnet`, {
				method: 'POST',
				headers: {
					...this.getHeaders(),
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: data.toString()
			})
		);

		// Automatically select all files - if this fails, torrent is invalid
		try {
			await this.selectAllFiles(result.id);
		} catch (error) {
			// Delete the invalid torrent and throw error
			try {
				await this.deleteTorrent(result.id);
			} catch (deleteError) {
				console.warn('Failed to delete invalid torrent:', deleteError);
			}
			throw new Error('Invalid Torrent');
		}

		return result;
	}

	/**
	 * Add a torrent file to Real-Debrid
	 */
	async addTorrent(torrentFile: Buffer | ArrayBuffer | Uint8Array): Promise<RealDebridTorrent> {
		// Convert to Blob which is compatible with fetch BodyInit
		const body = new Blob([torrentFile as BlobPart], { type: 'application/octet-stream' });

		const result = await this.handleRateLimit<RealDebridTorrent>(() =>
			fetch(`${REAL_DEBRID_API_BASE}/torrents/addTorrent`, {
				method: 'PUT',
				headers: {
					...this.getHeaders(),
					'Content-Type': 'application/octet-stream'
				},
				body: body
			})
		);

		// Automatically select all files - if this fails, torrent is invalid
		try {
			await this.selectAllFiles(result.id);
		} catch (error) {
			// Delete the invalid torrent and throw error
			try {
				await this.deleteTorrent(result.id);
			} catch (deleteError) {
				console.warn('Failed to delete invalid torrent:', deleteError);
			}
			throw new Error('Invalid Torrent');
		}

		return result;
	}

	/**
	 * Select all files for a torrent
	 * If this fails, the torrent is likely invalid
	 */
	async selectAllFiles(torrentId: string): Promise<void> {
		await this.checkRateLimit();
		
		const data = new URLSearchParams({ files: 'all' });
		const response = await fetch(`${REAL_DEBRID_API_BASE}/torrents/selectFiles/${torrentId}`, {
			method: 'POST',
			headers: {
				...this.getHeaders(),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: data.toString()
		});

		// Handle 204 No Content (success)
		if (response.status === 204) {
			return;
		}

		const text = await response.text();
		let result: any = {};
		if (text) {
			try {
				result = JSON.parse(text);
			} catch (e) {
				// Not JSON
			}
		}

		// If file selection fails, treat as invalid torrent
		if (!response.ok) {
			const errorMsg = (result as RealDebridError).error || `Failed to select files: ${response.status}`;
			throw new Error(errorMsg);
		}
	}

	/**
	 * Get torrent information
	 */
	async getTorrentInfo(torrentId: string): Promise<RealDebridTorrent> {
		return await this.handleRateLimit<RealDebridTorrent>(() =>
			fetch(`${REAL_DEBRID_API_BASE}/torrents/info/${torrentId}`, {
				method: 'GET',
				headers: this.getHeaders()
			})
		);
	}

	/**
	 * Delete a torrent
	 * Returns void - handles 204 No Content responses properly
	 */
	async deleteTorrent(torrentId: string): Promise<void> {
		// Pre-check rate limit
		await this.checkRateLimit();

		const response = await fetch(`${REAL_DEBRID_API_BASE}/torrents/delete/${torrentId}`, {
			method: 'DELETE',
			headers: this.getHeaders()
		});

		// 204 No Content is the expected success response for DELETE
		if (response.status === 204) {
			return;
		}

		// For other responses, check for errors
		if (!response.ok) {
			// Try to get error message
			try {
				const text = await response.text();
				if (text) {
					const result = JSON.parse(text) as RealDebridError;
					// Check for rate limiting
					if (response.status === 429 || result.error_code === 34) {
						throw new Error('Rate limit exceeded. Please wait before making more requests.');
					}
					throw new Error(result.error || `Failed to delete torrent: ${response.status}`);
				}
			} catch (e) {
				if (e instanceof Error && e.message.includes('Rate limit')) {
					throw e;
				}
				throw new Error(`Failed to delete torrent: ${response.status} ${response.statusText}`);
			}
		}
	}

	/**
	 * Get list of all torrents
	 */
	async getTorrents(): Promise<RealDebridTorrent[]> {
		return await this.handleRateLimit<RealDebridTorrent[]>(() =>
			fetch(`${REAL_DEBRID_API_BASE}/torrents`, {
				method: 'GET',
				headers: this.getHeaders()
			})
		);
	}

	/**
	 * Check if torrents exist by hash
	 * Returns array of all matching torrents (multiple torrents can share the same hash)
	 * Uses the hash field from Real-Debrid API responses (t.hash)
	 * Real-Debrid API returns torrents with a 'hash' field - we compare against that
	 */
	async checkTorrentsByHash(hash: string): Promise<RealDebridTorrent[]> {
		try {
			const torrents = await this.getTorrents();
			// Normalize input hash to lowercase (Real-Debrid stores hashes in lowercase hex)
			const normalizedHash = hash.toLowerCase().trim();
			return torrents.filter(t => {
				if (!t.hash) return false;
				// Compare against the hash field from Real-Debrid API response
				return t.hash.toLowerCase().trim() === normalizedHash;
			});
		} catch (error) {
			console.error('Error checking torrents by hash:', error);
			// Don't throw - just return empty array so we can still add the torrent
			return [];
		}
	}

	/**
	 * Check if a torrent exists by hash (backward compatibility - returns first match)
	 * @deprecated Use checkTorrentsByHash for multiple matches
	 */
	async checkTorrentByHash(hash: string): Promise<RealDebridTorrent | null> {
		const torrents = await this.checkTorrentsByHash(hash);
		return torrents.length > 0 ? torrents[0] : null;
	}

	/**
	 * Extract hash from magnet link
	 * Handles both Base32 and hex formats
	 * Returns hash in lowercase hex format (matching Real-Debrid API format)
	 */
	static extractHashFromMagnet(magnetLink: string): string | null {
		// Try hex format first (40 hex characters)
		const hexMatch = magnetLink.match(/btih:([0-9a-fA-F]{40})/i);
		if (hexMatch) {
			return hexMatch[1].toLowerCase();
		}
		
		// Try Base32 format (32 alphanumeric characters, case-insensitive)
		const base32Match = magnetLink.match(/btih:([A-Za-z0-9]{32})/i);
		if (base32Match) {
			// Real-Debrid API stores hashes as lowercase hex (40 chars)
			// We need to convert Base32 (32 chars) to hex format for matching
			// Note: This is a simplified conversion - full Base32 decoding would require a library
			// For now, return the Base32 as-is and let Real-Debrid API handle the matching
			// Real-Debrid should normalize Base32 to hex when storing, so we compare case-insensitively
			return base32Match[1].toUpperCase();
		}
		
		// Try any hash format (fallback)
		const anyMatch = magnetLink.match(/btih:([^&]+)/i);
		if (anyMatch) {
			const hash = anyMatch[1];
			// If it's 40 hex chars, normalize to lowercase (Real-Debrid API format)
			if (/^[0-9a-fA-F]{40}$/i.test(hash)) {
				return hash.toLowerCase();
			}
			// If it's 32 chars (Base32), return uppercase for now
			if (/^[A-Za-z0-9]{32}$/.test(hash)) {
				return hash.toUpperCase();
			}
			// Otherwise return as-is
			return hash;
		}
		
		return null;
	}

	/**
	 * Unrestrict a link (convert to direct download)
	 */
	async unrestrictLink(link: string, password?: string): Promise<RealDebridUnrestrictResponse> {
		const data = new URLSearchParams({ link });
		if (password) {
			data.append('password', password);
		}

		return await this.handleRateLimit<RealDebridUnrestrictResponse>(() =>
			fetch(`${REAL_DEBRID_API_BASE}/unrestrict/link`, {
				method: 'POST',
				headers: {
					...this.getHeaders(),
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: data.toString()
			})
		);
	}

	/**
	 * Check if a link is available for unrestriction
	 */
	async checkLink(link: string, password?: string): Promise<{ id: string; filename: string }> {
		const data = new URLSearchParams({ link });
		if (password) {
			data.append('password', password);
		}

		const response = await fetch(`${REAL_DEBRID_API_BASE}/unrestrict/check`, {
			method: 'POST',
			headers: {
				...this.getHeaders(),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: data.toString()
		});

		const result = await response.json();

		if (!response.ok) {
			throw new Error((result as RealDebridError).error || 'Link not available');
		}

		return result as { id: string; filename: string };
	}

	/**
	 * Get user info
	 */
	async getUserInfo(): Promise<any> {
		const response = await fetch(`${REAL_DEBRID_API_BASE}/user`, {
			method: 'GET',
			headers: this.getHeaders()
		});

		const result = await response.json();

		if (!response.ok) {
			throw new Error((result as RealDebridError).error || 'Failed to get user info');
		}

		return result;
	}
}

// Export factory function to create service with auth token
export function createRealDebridService(authToken: string) {
	return new RealDebridService(authToken);
}

// Default instance (will be created in server endpoints with env variable)
// Note: This will be created lazily when needed, not at import time
export function getDefaultRealDebridService(): RealDebridService {
	// Dynamic import to avoid build-time issues
	const auth = process.env.REAL_DEBRID_AUTH || '';
	return new RealDebridService(auth);
}

