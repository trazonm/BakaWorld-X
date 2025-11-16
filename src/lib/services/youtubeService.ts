// YouTube downloader service - Clean implementation
import type { YouTubeVideoInfo, YouTubeDownloadOptions } from '$lib/types/youtube';
import { spawn, spawnSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp', 'youtube');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
	fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function findYtDlpCommand(): string | null {
	const commands = ['yt-dlp', 'youtube-dl'];
	for (const cmd of commands) {
		try {
			execSync(`which ${cmd}`, { stdio: 'ignore' });
			return cmd;
		} catch {
			continue;
		}
	}
	return null;
}

export class YouTubeService {
	/**
	 * Get video information from YouTube URL
	 */
	async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
		const command = findYtDlpCommand();
		if (!command) {
			throw new Error('yt-dlp or youtube-dl not found. Please install yt-dlp.');
		}

		return new Promise((resolve, reject) => {
			const args = [
				url,
				'--dump-json',
				'--no-playlist'
			];

			let output = '';
			const process = spawn(command, args, {
				stdio: ['ignore', 'pipe', 'pipe']
			});

			process.stdout.on('data', (data) => {
				output += data.toString();
			});

			process.stderr.on('data', (data) => {
				// yt-dlp outputs progress to stderr, ignore it
			});

			process.on('error', (error) => {
				reject(new Error(`Failed to spawn ${command}: ${error.message}`));
			});

			process.on('close', (code) => {
				if (code === 0) {
					try {
						const info = JSON.parse(output.trim().split('\n').pop() || '{}');
						resolve({
							id: info.id,
							title: info.title || 'Unknown',
							thumbnail: info.thumbnail || '',
							duration: info.duration || 0,
							views: info.view_count || 0,
							channel: {
								name: info.channel || 'Unknown',
								url: info.channel_url || ''
							},
							formats: info.formats || []
						});
					} catch (error) {
						reject(new Error('Failed to parse video information'));
					}
				} else {
					reject(new Error(`yt-dlp failed with code ${code}`));
				}
			});
		});
	}

	/**
	 * Download video to file and convert to H.264 MP4
	 */
	async downloadVideoToFile(
		url: string,
		quality: string,
		fileId: string,
		progressCallback?: (progress: number, stage: string) => void
	): Promise<string> {
		const command = findYtDlpCommand();
		if (!command) {
			throw new Error('yt-dlp or youtube-dl not found.');
		}

		const baseName = `youtube-${fileId}`;
		const tempPattern = path.join(TEMP_DIR, `${baseName}.download`);
		const tempFile = `${tempPattern}.%(ext)s`;
		const finalFile = path.join(TEMP_DIR, `${baseName}.mp4`);

		if (progressCallback) progressCallback(0, 'Starting download...');

		// Get height for quality
		const height = this.getHeightForQuality(quality);

		// Step 1: Download with fallbacks for available qualities
		const heightFallbacks = this.getHeightFallbacks(height);
		let downloaded = false;
		let downloadedPath: string | null = null;
		let lastError = '';
		for (let i = 0; i < heightFallbacks.length && !downloaded; i++) {
			const h = heightFallbacks[i];
			const formatSelector =
				`bv*[ext=mp4][vcodec*=avc1][height<=${h}]+ba[ext=m4a]/` + // H.264 + AAC MP4 merge
				`bv*[height<=${h}]+ba/` +                                // any container, merge later
				`b[ext=mp4][vcodec!=none][acodec!=none]/` +              // premerged mp4
				`b`;                                                     // best available

			const downloadArgs = [
				url,
				'-o', tempFile,
				'--no-playlist',
				'--newline',
				'--no-warnings',
				'--no-mtime',
				'-f', formatSelector,
				'--merge-output-format', 'mp4'
			];

			if (progressCallback) {
				progressCallback(1 + i, `Fetching formats (<=${h}p)...`);
			}

			// Clean up leftovers from previous attempts
			this.cleanupTempFiles(fileId);

			const attemptResult = await new Promise<{ ok: boolean; err?: string }>((resolve) => {
				const proc = spawn(command, downloadArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
				let errorOutput = '';
				let stderrOutput = '';

				proc.stderr.on('data', (data) => {
					const output = data.toString();
					stderrOutput += output;
					if (progressCallback) {
						if (output.includes('[download] Destination:') || output.includes('Downloading item')) {
							progressCallback(2 + i, 'Starting download...');
						}
						const match = output.match(/\[download\]\s+(\d+\.?\d*)%/);
						if (match) {
							const percent = parseFloat(match[1]);
							progressCallback(Math.min(percent * 0.7, 70), `Downloading... ${percent.toFixed(0)}%`);
						} else if (output.includes('[Merger]')) {
							progressCallback(70, 'Merging video and audio...');
						} else if (output.includes('[ExtractAudio]')) {
							progressCallback(72, 'Extracting audio...');
						} else if (output.includes('[ffmpeg]')) {
							progressCallback(74, 'Post-processing...');
						}
					}
					if (output.toLowerCase().includes('error') || output.toLowerCase().includes('requested format is not available')) {
						errorOutput += output;
					}
				});

				proc.on('error', (error) => {
					resolve({ ok: false, err: `Failed to spawn ${command}: ${error.message}` });
				});

				proc.on('close', (code) => {
					if (code === 0) {
						if (progressCallback) progressCallback(75, 'Download complete');
						resolve({ ok: true });
					} else {
						const errMsg = errorOutput || stderrOutput.substring(0, 500);
						resolve({ ok: false, err: errMsg });
					}
				});
			});

			if (attemptResult.ok) {
				downloadedPath = this.findDownloadedFile(fileId);
				if (downloadedPath && this.isVideoFile(downloadedPath) && this.hasVideoStream(downloadedPath)) {
					downloaded = true;
				} else {
					lastError = 'Downloaded format lacked video track. Trying next available quality.';
					if (downloadedPath && fs.existsSync(downloadedPath)) {
						try {
							fs.unlinkSync(downloadedPath);
						} catch (err) {
							console.error('Error deleting audio-only download:', err);
						}
					}
				}
			} else {
				lastError = attemptResult.err || 'Unknown download error';
				// Try next fallback height
			}
		}

		if (!downloaded || !downloadedPath) {
			throw new Error(`Download failed: ${lastError}`);
		}

		// Step 3: Convert to H.264 MP4 for QuickTime compatibility
		if (progressCallback) progressCallback(80, 'Converting to H.264 MP4...');
		
		await this.convertToMp4(downloadedPath, finalFile, quality, progressCallback);

		// Clean up original file
		try {
			if (downloadedPath !== finalFile) {
				fs.unlinkSync(downloadedPath);
			}
		} catch (err) {
			console.error('Error cleaning up temp file:', err);
		}

		if (progressCallback) progressCallback(100, 'Complete!');
		return finalFile;
	}

	async downloadAudioToFile(
		url: string,
		audioFormat: 'mp3' | 'wav' | 'flac',
		audioBitrate: number | undefined,
		fileId: string,
		progressCallback?: (progress: number, stage: string) => void
	): Promise<string> {
		const command = findYtDlpCommand();
		if (!command) {
			throw new Error('yt-dlp or youtube-dl not found.');
		}

		const baseName = `youtube-${fileId}`;
		const tempPattern = path.join(TEMP_DIR, `${baseName}.audio`);
		const tempFile = `${tempPattern}.%(ext)s`;
		const finalFile = path.join(TEMP_DIR, `${baseName}.${audioFormat}`);

		if (progressCallback) progressCallback(0, 'Starting audio download...');

		const args = [
			url,
			'-o', tempFile,
			'--no-playlist',
			'--newline',
			'--no-warnings',
			'--no-mtime',
			'-f', 'bestaudio/best'
		];

		await new Promise<void>((resolve, reject) => {
			const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
			let errorOutput = '';
			let stderrOutput = '';

			proc.stderr.on('data', (data) => {
				const output = data.toString();
				stderrOutput += output;
				if (progressCallback) {
					const match = output.match(/\[download\]\s+(\d+\.?\d*)%/);
					if (match) {
						const percent = parseFloat(match[1]);
						progressCallback(Math.min(percent * 0.7, 70), `Downloading audio... ${percent.toFixed(0)}%`);
					}
				}
				if (output.toLowerCase().includes('error')) {
					errorOutput += output;
				}
			});

			proc.on('error', (error) => {
				reject(new Error(`Failed to spawn ${command}: ${error.message}`));
			});

			proc.on('close', (code) => {
				if (code === 0) {
					if (progressCallback) progressCallback(75, 'Audio download complete');
					resolve();
				} else {
					reject(new Error(`Audio download failed: ${errorOutput || stderrOutput.substring(0, 500)}`));
				}
			});
		});

		const downloadedPath = this.findDownloadedFileByPrefix(`${baseName}.audio`);
		if (!downloadedPath) {
			throw new Error('Downloaded audio file not found');
		}

		if (progressCallback) progressCallback(80, `Converting to ${audioFormat.toUpperCase()}...`);
		await this.convertAudio(downloadedPath, finalFile, audioFormat, audioBitrate, progressCallback);

		try {
			if (fs.existsSync(downloadedPath)) {
				fs.unlinkSync(downloadedPath);
			}
		} catch (err) {
			console.error('Error cleaning audio temp file:', err);
		}

		if (progressCallback) progressCallback(100, 'Complete!');
		return finalFile;
	}

	private async convertToMp4(
		inputFile: string,
		outputFile: string,
		quality: string,
		progressCallback?: (progress: number, stage: string) => void
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const scale = this.getScaleFilter(quality);
			const ffmpegArgs = [
				'-i', inputFile,
					// Explicitly map first video and audio streams if present
					'-map', '0:v:0?',
					'-map', '0:a:0?',
				'-c:v', 'libx264',
					'-pix_fmt', 'yuv420p', // QuickTime-compatible pixel format
					'-profile:v', 'high',
					'-level', '4.1',
				'-preset', 'fast',
				'-crf', '23',
				'-c:a', 'aac',
				'-b:a', '192k',
				'-movflags', '+faststart',
					'-shortest',
				...scale.split(' ').filter(Boolean),
				'-y',
				outputFile
			];

			const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
				stdio: ['ignore', 'pipe', 'pipe']
			});

			let errorOutput = '';
			let duration = 0;

			ffmpeg.stderr.on('data', (data) => {
				const output = data.toString();
				errorOutput += output;

				if (progressCallback) {
					const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
					const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);

					if (durationMatch && !duration) {
						const [, h, m, s, ms] = durationMatch;
						duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseFloat(`0.${ms}`);
					}

					if (timeMatch && duration) {
						const [, h, m, s, ms] = timeMatch;
						const time = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseFloat(`0.${ms}`);
						const percent = (time / duration) * 100;
						progressCallback(80 + (percent * 0.15), `Converting... ${percent.toFixed(0)}%`);
					}
				}
			});

			ffmpeg.on('error', (error) => {
				reject(new Error(`ffmpeg not found: ${error.message}`));
			});

			ffmpeg.on('close', (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`ffmpeg failed: ${errorOutput.substring(0, 500)}`));
				}
			});
		});
	}

	private async convertAudio(
		inputFile: string,
		outputFile: string,
		format: 'mp3' | 'wav' | 'flac',
		bitrate?: number,
		progressCallback?: (progress: number, stage: string) => void
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const args = ['-i', inputFile];

			if (format === 'mp3') {
				args.push('-vn', '-c:a', 'libmp3lame', '-b:a', `${bitrate || 320}k`);
			} else if (format === 'wav') {
				args.push('-vn', '-c:a', 'pcm_s16le');
			} else if (format === 'flac') {
				args.push('-vn', '-c:a', 'flac');
			}

			args.push('-y', outputFile);

			const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
			let errorOutput = '';

			ffmpeg.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});

			ffmpeg.on('error', (error) => {
				reject(new Error(`ffmpeg not found: ${error.message}`));
			});

			ffmpeg.on('close', (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`Audio conversion failed: ${errorOutput.substring(0, 500)}`));
				}
			});
		});
	}

	private getHeightForQuality(quality: string): number {
		const map: Record<string, number> = {
			'4k': 2160,
			'1080p': 1080,
			'720p': 720,
			'480p': 480,
			'360p': 360,
			'240p': 240,
			'144p': 144
		};
		return map[quality] || 1080;
	}

	private getScaleFilter(quality: string): string {
		const height = this.getHeightForQuality(quality);
		return `-vf scale=-2:${height}`;
	}

	// Provide descending quality fallbacks down to 144p
	private getHeightFallbacks(target: number): number[] {
		const steps = [2160, 1440, 1080, 720, 480, 360, 240, 144];
		const unique = steps.filter(h => h <= target);
		if (unique.length === 0) {
			return [target, 720, 480, 360, 240, 144];
		}
		const result = Array.from(new Set(unique)).sort((a, b) => b - a);
		if (!result.includes(144)) result.push(144);
		return result;
	}

	private cleanupTempFiles(fileId: string): void {
		const files = fs.readdirSync(TEMP_DIR);
		for (const file of files) {
			if (file.startsWith(`youtube-${fileId}.download`)) {
				try {
					fs.unlinkSync(path.join(TEMP_DIR, file));
				} catch (err) {
					console.error('Error cleaning temp file:', err);
				}
			}
		}
	}

	private findDownloadedFile(fileId: string): string | null {
		const files = fs.readdirSync(TEMP_DIR);
		const file = files.find(f =>
			f.startsWith(`youtube-${fileId}.download`) &&
			!f.endsWith('.mp4.part') &&
			!f.endsWith('.mp4.ytdl') &&
			!f.endsWith('.part') &&
			!f.endsWith('.ytdl')
		);
		return file ? path.join(TEMP_DIR, file) : null;
	}

	private findDownloadedFileByPrefix(prefix: string): string | null {
		const files = fs.readdirSync(TEMP_DIR);
		const file = files.find(f =>
			f.startsWith(prefix) &&
			!f.endsWith('.part') &&
			!f.endsWith('.ytdl')
		);
		return file ? path.join(TEMP_DIR, file) : null;
	}

	private isVideoFile(filePath: string): boolean {
		const videoExts = ['.mp4', '.webm', '.mkv', '.mov'];
		return videoExts.includes(path.extname(filePath).toLowerCase());
	}

	private hasVideoStream(filePath: string): boolean {
		try {
			const result = spawnSync('ffprobe', [
				'-v', 'error',
				'-select_streams', 'v:0',
				'-show_entries', 'stream=codec_type',
				'-of', 'csv=p=0',
				filePath
			]);
			if (result.status !== 0) {
				return false;
			}
			return result.stdout.toString().trim().length > 0;
		} catch (error) {
			console.warn('ffprobe unavailable, assuming video stream exists:', error);
			return true;
		}
	}
}

export function createYouTubeService(): YouTubeService {
	return new YouTubeService();
}
