// Spotify downloader service - Downloads using spotdl (YouTube Music as source)
import type { SpotifyTrackInfo, SpotifyDownloadOptions } from '$lib/types/spotify';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile) as (
	cmd: string,
	args?: readonly string[] | null,
	opts?: { encoding: 'utf-8'; maxBuffer?: number }
) => Promise<{ stdout: string; stderr: string }>;

const TEMP_DIR = path.join(process.cwd(), 'temp', 'spotify');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
	fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function newestFileWithExtension(dir: string, ext: string): string | null {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	let best: { path: string; mtime: number } | null = null;
	for (const ent of entries) {
		if (!ent.isFile() || !ent.name.endsWith(ext)) continue;
		const full = path.join(dir, ent.name);
		const mtime = fs.statSync(full).mtimeMs;
		if (!best || mtime > best.mtime) best = { path: full, mtime };
	}
	return best?.path ?? null;
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
				const { stdout: result } = await execFileAsync(
					'python3',
					[scriptPath, 'info', urlToUse],
					{ encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
				);

				const output = result.trim();
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
			await execFileAsync('which', ['spotdl'], { encoding: 'utf-8' });
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
 * Download track from Spotify using spotdl (YouTube Music as source).
 * `workDir` must be an empty or dedicated folder so we never pick another track's file.
 * Uses async child processes only so the Node event loop is not blocked (other requests keep working).
 */
async function downloadFromSpotify(
	url: string,
	workDir: string,
	finalOutputPath: string,
	format: 'flac' | 'mp3',
	progressCallback?: (progress: number, stage: string) => void
): Promise<string> {
	if (progressCallback) progressCallback(0, 'Starting download...');

	const scriptPath = path.join(process.cwd(), 'scripts', 'spotify_downloader.py');
	if (fs.existsSync(scriptPath)) {
		try {
			const { stdout } = await execFileAsync(
				'python3',
				[scriptPath, 'download', url, format, workDir],
				{ encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
			);
			const data = JSON.parse(stdout.trim());
			if (data.success && data.file) {
				const downloaded = data.file as string;
				if (downloaded !== finalOutputPath && fs.existsSync(downloaded)) {
					if (fs.existsSync(finalOutputPath)) fs.unlinkSync(finalOutputPath);
					fs.renameSync(downloaded, finalOutputPath);
				}
				if (progressCallback) progressCallback(100, 'Download complete');
				return finalOutputPath;
			}
			throw new Error(data.error || 'Download failed');
		} catch {
			console.log('Python script failed, trying spotdl directly');
		}
	}

	try {
		await execFileAsync('which', ['spotdl'], { encoding: 'utf-8' });
	} catch {
		throw new Error('spotdl not found. Please install spotdl: pip install spotdl');
	}

	return await new Promise<string>((resolve, reject) => {
		const args = [
			url,
			'--output', workDir,
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
			cwd: workDir
		});

		let errorOutput = '';

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
				const ext = `.${format}`;
				const foundFile = newestFileWithExtension(workDir, ext);
				if (foundFile) {
					if (foundFile !== finalOutputPath && fs.existsSync(foundFile)) {
						if (fs.existsSync(finalOutputPath)) fs.unlinkSync(finalOutputPath);
						fs.renameSync(foundFile, finalOutputPath);
					}
					if (progressCallback) progressCallback(100, 'Download complete');
					resolve(finalOutputPath);
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
		if (progressCallback) progressCallback(2, 'Fetching track metadata...');

		const trackInfo = await this.getTrackInfo(url);

		if (progressCallback) progressCallback(5, 'Track info retrieved');

		const format = options.format || 'flac';
		const baseName = `spotify-${fileId}`;
		const finalFile = path.join(TEMP_DIR, `${baseName}.${format}`);
		const workDir = path.join(TEMP_DIR, '_inflight', fileId);
		fs.mkdirSync(workDir, { recursive: true });

		if (progressCallback) progressCallback(10, 'Starting download from YouTube Music...');
		
		try {
			await downloadFromSpotify(url, workDir, finalFile, format, (progress, stage) => {
				if (progressCallback) {
					progressCallback(10 + (progress * 0.9), stage);
				}
			});
		} finally {
			try {
				fs.rmSync(workDir, { recursive: true, force: true });
			} catch {
				// ignore cleanup errors
			}
		}

		if (progressCallback) progressCallback(100, 'Download complete');
		return finalFile;
	}
}

export function createSpotifyService(): SpotifyService {
	return new SpotifyService();
}
