// Temp file cleanup utility
// Cleans up old files from temp/youtube and temp/spotify directories
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const YOUTUBE_DIR = path.join(TEMP_DIR, 'youtube');
const SPOTIFY_DIR = path.join(TEMP_DIR, 'spotify');

// Maximum age for files (4 hours in milliseconds)
const MAX_FILE_AGE = 4 * 60 * 60 * 1000;

// Maximum age for partial/incomplete files (1 hour)
const MAX_PARTIAL_FILE_AGE = 60 * 60 * 1000;

interface CleanupStats {
	deleted: number;
	bytesFreed: number;
	errors: number;
}

/**
 * Clean up old files in a directory
 */
function cleanupDirectory(dir: string, stats: CleanupStats): void {
	if (!fs.existsSync(dir)) {
		return;
	}

	try {
		const files = fs.readdirSync(dir);
		const now = Date.now();

		for (const file of files) {
			const filePath = path.join(dir, file);
			
			try {
				const stats_info = fs.statSync(filePath);
				const fileAge = now - stats_info.mtimeMs;

				// Check if file is a partial/incomplete download (has .download in name or very small)
				const isPartial = file.includes('.download') || 
				                 (stats_info.size < 1024 && fileAge > MAX_PARTIAL_FILE_AGE);

				// Delete if:
				// 1. File is older than MAX_FILE_AGE (4 hours)
				// 2. File is partial and older than MAX_PARTIAL_FILE_AGE (1 hour)
				// 3. File is incomplete (very small) and older than 1 hour
				if (fileAge > MAX_FILE_AGE || (isPartial && fileAge > MAX_PARTIAL_FILE_AGE)) {
					const fileSize = stats_info.size;
					fs.unlinkSync(filePath);
					stats.deleted++;
					stats.bytesFreed += fileSize;
				}
			} catch (error) {
				// File might have been deleted already or permission issue
				stats.errors++;
				console.error(`Error cleaning up file ${filePath}:`, error);
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dir}:`, error);
		stats.errors++;
	}
}

/**
 * Clean up all temp files
 * Returns cleanup statistics
 */
export function cleanupTempFiles(): CleanupStats {
	const stats: CleanupStats = {
		deleted: 0,
		bytesFreed: 0,
		errors: 0
	};

	console.log(`[Temp Cleanup] Starting cleanup of temp directories...`);
	
	// Clean up YouTube files
	cleanupDirectory(YOUTUBE_DIR, stats);
	
	// Clean up Spotify files
	cleanupDirectory(SPOTIFY_DIR, stats);

	if (stats.deleted > 0) {
		const mbFreed = (stats.bytesFreed / (1024 * 1024)).toFixed(2);
		console.log(`[Temp Cleanup] Deleted ${stats.deleted} file(s), freed ${mbFreed} MB`);
	}

	if (stats.errors > 0) {
		console.warn(`[Temp Cleanup] Encountered ${stats.errors} error(s) during cleanup`);
	}

	return stats;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get current temp directory statistics
 */
export function getTempStats(): {
	youtube: { files: number; size: number };
	spotify: { files: number; size: number };
	total: { files: number; size: number };
} {
	const stats = {
		youtube: { files: 0, size: 0 },
		spotify: { files: 0, size: 0 },
		total: { files: 0, size: 0 }
	};

	function getDirStats(dir: string): { files: number; size: number } {
		if (!fs.existsSync(dir)) {
			return { files: 0, size: 0 };
		}

		let files = 0;
		let size = 0;

		try {
			const entries = fs.readdirSync(dir);
			for (const entry of entries) {
				const entryPath = path.join(dir, entry);
				try {
					const stat = fs.statSync(entryPath);
					if (stat.isFile()) {
						files++;
						size += stat.size;
					}
				} catch {
					// Ignore errors for individual files
				}
			}
		} catch (error) {
			console.error(`Error getting stats for ${dir}:`, error);
		}

		return { files, size };
	}

	stats.youtube = getDirStats(YOUTUBE_DIR);
	stats.spotify = getDirStats(SPOTIFY_DIR);
	stats.total.files = stats.youtube.files + stats.spotify.files;
	stats.total.size = stats.youtube.size + stats.spotify.size;

	return stats;
}

