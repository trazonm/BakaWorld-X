// Spotify downloader service - Downloads using spotdl (YouTube Music as source)
import type { SpotifyTrackInfo, SpotifyDownloadOptions, SpotifyDownloadProgress } from '$lib/types/spotify';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp', 'spotify');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
	fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Extract Spotify track ID from URL
 */
function extractTrackId(url: string): string | null {
	const patterns = [
		/spotify\.com\/track\/([a-zA-Z0-9]+)/,
		/spotify:track:([a-zA-Z0-9]+)/
	];
	
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}
	return null;
}

/**
 * Get track information from Spotify URL using Python script or spotdl
 */
async function getTrackInfoFromAPI(trackId: string, originalUrl?: string): Promise<SpotifyTrackInfo> {
	try {
		// Try Python script first
		const scriptPath = path.join(process.cwd(), 'scripts', 'spotify_downloader.py');
		if (fs.existsSync(scriptPath)) {
			try {
				const urlToUse = originalUrl || `https://open.spotify.com/track/${trackId}`;
				const result = execSync(`python3 "${scriptPath}" info "${urlToUse}"`, {
					encoding: 'utf-8',
					maxBuffer: 10 * 1024 * 1024,
					stdio: ['ignore', 'pipe', 'pipe']
				});
				
				const output = result.toString().trim();
				if (!output) {
					throw new Error('Python script returned empty output');
				}
				
				const data = JSON.parse(output);
				if (data.error) {
					throw new Error(data.error);
				}
				
				return {
					id: data.id || trackId,
					title: data.title || 'Unknown Track',
					artist: data.artist || 'Unknown Artist',
					artists: data.artists || [data.artist || 'Unknown Artist'],
					album: data.album || 'Unknown Album',
					albumArt: data.albumArt,
					duration: data.duration,
					externalUrls: {
						spotify: `https://open.spotify.com/track/${trackId}`
					}
				};
			} catch (error: any) {
				console.error('Python script failed:', error);
				throw new Error(`Failed to get track info: ${error?.message || 'Unknown error'}`);
			}
		}

		// Fallback: Try spotdl directly
		try {
			execSync('which spotdl', { stdio: 'ignore' });
			// spotdl query command would need to be called here
			// For now, return basic info
		} catch {
			// spotdl not available
		}

		// Final fallback: return minimal info
		return {
			id: trackId,
			title: 'Unknown Track',
			artist: 'Unknown Artist',
			artists: ['Unknown Artist'],
			album: 'Unknown Album',
			externalUrls: {
				spotify: `https://open.spotify.com/track/${trackId}`
			}
		};
	} catch (error) {
		// Final fallback: return minimal info
		return {
			id: trackId,
			title: 'Unknown Track',
			artist: 'Unknown Artist',
			artists: ['Unknown Artist'],
			album: 'Unknown Album',
			externalUrls: {
				spotify: `https://open.spotify.com/track/${trackId}`
			}
		};
	}
}

/**
 * Download track from Spotify using spotdl (YouTube Music as source)
 */
async function downloadFromSpotify(
	url: string,
	outputPath: string,
	format: 'flac' | 'mp3',
	progressCallback?: (progress: number, stage: string) => void
): Promise<string> {
	return new Promise((resolve, reject) => {
		if (progressCallback) progressCallback(0, 'Starting download...');
		
		// Try Python script first
		const scriptPath = path.join(process.cwd(), 'scripts', 'spotify_downloader.py');
		if (fs.existsSync(scriptPath)) {
			try {
				const result = execSync(
					`python3 "${scriptPath}" download "${url}" ${format} "${path.dirname(outputPath)}"`,
					{ encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
				);
				const data = JSON.parse(result.trim());
				if (data.success && data.file) {
					// Move to final location if needed
					if (data.file !== outputPath && fs.existsSync(data.file)) {
						fs.renameSync(data.file, outputPath);
					}
					if (progressCallback) progressCallback(100, 'Download complete');
					resolve(outputPath);
					return;
				}
				throw new Error(data.error || 'Download failed');
			} catch (error: any) {
				console.log('Python script failed, trying spotdl directly');
			}
		}

		// Fallback: Use spotdl directly
		try {
			execSync('which spotdl', { stdio: 'ignore' });
		} catch {
			reject(new Error('spotdl not found. Please install spotdl: pip install spotdl'));
			return;
		}

		const args = [
			url,
			'--output', path.dirname(outputPath),
			'--format', format,
			'--threads', '4'
			// Note: Album art is embedded automatically by spotdl by default
			// (only use --skip-album-art if you want to disable it)
		];

		if (format === 'flac') {
			args.push('--bitrate', '0'); // Highest quality
		} else if (format === 'mp3') {
			args.push('--bitrate', '320k'); // 320kbps MP3
		}

		const proc = spawn('spotdl', args, {
			stdio: ['ignore', 'pipe', 'pipe'],
			cwd: path.dirname(outputPath)
		});

		let errorOutput = '';
		let downloadedFile: string | null = null;

		proc.stdout.on('data', (data) => {
			const output = data.toString();
			if (progressCallback) {
				if (output.includes('Downloading')) {
					progressCallback(20, 'Downloading from YouTube Music...');
				} else if (output.includes('Converting')) {
					progressCallback(60, 'Converting audio...');
				} else if (output.includes('Embedding')) {
					progressCallback(80, 'Embedding metadata...');
				}
			}
		});

		proc.stderr.on('data', (data) => {
			const output = data.toString();
			errorOutput += output;
			
			if (progressCallback) {
				// Parse spotdl progress
				const percentMatch = output.match(/(\d+)%/);
				if (percentMatch) {
					const percent = parseInt(percentMatch[1]);
					progressCallback(percent, `Processing... ${percent}%`);
				} else if (output.includes('Downloading')) {
					progressCallback(30, 'Downloading audio...');
				} else if (output.includes('Converting')) {
					progressCallback(70, 'Converting to ' + format.toUpperCase() + '...');
				} else if (output.includes('Embedding')) {
					progressCallback(90, 'Embedding metadata...');
				}
			}
		});

		proc.on('error', (error) => {
			reject(new Error(`Failed to spawn spotdl: ${error.message}`));
		});

		proc.on('close', (code) => {
			if (code === 0) {
				// Find downloaded file - spotdl uses format: "Artist - Title.ext"
				const dir = path.dirname(outputPath);
				const files = fs.readdirSync(dir);
				const ext = `.${format}`;
				const flacFile = files.find(f => f.endsWith(ext));
				
				if (flacFile) {
					const foundFile = path.join(dir, flacFile);
					// Rename to match expected filename
					if (foundFile !== outputPath && fs.existsSync(foundFile)) {
						fs.renameSync(foundFile, outputPath);
					}
					if (progressCallback) progressCallback(100, 'Download complete');
					resolve(outputPath);
				} else {
					reject(new Error('Downloaded file not found'));
				}
			} else {
				reject(new Error(`spotdl failed: ${errorOutput.substring(0, 500)}`));
			}
		});
	});
}

export class SpotifyService {
	/**
	 * Get track information from Spotify URL
	 */
	async getTrackInfo(url: string): Promise<SpotifyTrackInfo> {
		const trackId = extractTrackId(url);
		if (!trackId) {
			throw new Error('Invalid Spotify URL');
		}

		return getTrackInfoFromAPI(trackId, url);
	}

	/**
	 * Download track in specified format using spotdl (YouTube Music as source)
	 */
	async downloadTrackToFile(
		url: string,
		options: SpotifyDownloadOptions,
		fileId: string,
		progressCallback?: (progress: number, stage: string) => void
	): Promise<string> {
		// Get track info
		const trackInfo = await this.getTrackInfo(url);
		
		if (progressCallback) progressCallback(5, 'Track info retrieved');

		const format = options.format || 'flac';
		const baseName = `spotify-${fileId}`;
		const finalFile = path.join(TEMP_DIR, `${baseName}.${format}`);

		if (progressCallback) progressCallback(10, 'Starting download from YouTube Music...');
		
		// Download using spotdl
		const downloadedPath = await downloadFromSpotify(url, finalFile, format, (progress, stage) => {
			if (progressCallback) {
				progressCallback(10 + (progress * 0.9), stage);
			}
		});

		// Move to final location if needed
		if (downloadedPath !== finalFile && fs.existsSync(downloadedPath)) {
			fs.renameSync(downloadedPath, finalFile);
		}

		if (progressCallback) progressCallback(100, 'Download complete');
		return finalFile;
	}
}

export function createSpotifyService(): SpotifyService {
	return new SpotifyService();
}
