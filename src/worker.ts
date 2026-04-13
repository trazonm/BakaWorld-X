// Background worker service for polling torrent downloads
// This runs independently from the frontend and continuously updates download progress
import { config } from 'dotenv';
import { Pool } from 'pg';
import {
	createRealDebridService,
	UnknownResourceError,
	isRealDebridWebDownloadPage,
	torrentDownloadLinkNeedsUnrestrict
} from './lib/services/realDebridService';
import { cleanupTempFiles } from './lib/server/tempCleanup';

// Load environment variables from .env file (for local development)
config();

// Database configuration
function getDbConfig() {
	return {
		user: process.env.DB_USER || 'bakaworld',
		host: process.env.DB_HOST || 'localhost',
		database: process.env.DB_NAME || 'bakaworld',
		password: process.env.DB_PASSWORD || '',
		port: Number(process.env.DB_PORT || '5432')
	};
}

const pool = new Pool(getDbConfig());

// Poll interval in milliseconds (default: 1 second; override with POLL_INTERVAL)
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 1000;

// Graceful shutdown
let isShuttingDown = false;

// Track if we're currently processing to avoid duplicate processing
let isProcessing = false;

// Debounce immediate polls (prevents spam from multiple quick adds)
let immediatePollTimeout: NodeJS.Timeout | null = null;
const IMMEDIATE_POLL_DELAY = 1000; // Wait 1 second after notification before polling

// Statistics tracking
interface WorkerStats {
	cycleCount: number;
	totalUsers: number;
	totalDownloads: number;
	completedDownloads: number;
	removedDownloads: number;
	errors: number;
	lastCycleTime: number;
}

let stats: WorkerStats = {
	cycleCount: 0,
	totalUsers: 0,
	totalDownloads: 0,
	completedDownloads: 0,
	removedDownloads: 0,
	errors: 0,
	lastCycleTime: 0
};

// Utility functions
function getTimestamp(): string {
	return new Date().toISOString();
}

function logWithTimestamp(message: string, level: 'info' | 'warn' | 'error' = 'info') {
	const prefix = `[${getTimestamp()}]`;
	const symbol = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
	console.log(`${prefix} ${symbol} ${message}`);
}

async function checkDatabaseConnection(): Promise<boolean> {
	try {
		await query('SELECT 1');
		return true;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorDetails = error instanceof Error && error.stack ? `\n${error.stack.split('\n').slice(0, 5).join('\n')}` : '';
		logWithTimestamp(`Database connection check failed: ${errorMessage}${errorDetails}`, 'error');
		
		// Log connection details for debugging (without password)
		const dbConfig = getDbConfig();
		logWithTimestamp(`Connection config: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} (user: ${dbConfig.user})`, 'warn');
		
		return false;
	}
}

async function query(text: string, params?: any[]) {
	const client = await pool.connect();
	try {
		const res = await client.query(text, params);
		return res;
	} finally {
		client.release();
	}
}

async function getAllUsersWithDownloads() {
	const result = await query(
		`SELECT username, downloads FROM users WHERE downloads IS NOT NULL AND jsonb_array_length(downloads) > 0`
	);
	return result.rows;
}

async function updateUserDownloads(username: string, downloads: any[]) {
	await query(
		`UPDATE users SET downloads = $1 WHERE username = $2`,
		[JSON.stringify(downloads), username]
	);
}

async function deleteDownloadById(username: string, downloadId: string) {
	await query(
		`UPDATE users SET downloads = COALESCE(
			(SELECT jsonb_agg(elem) FROM jsonb_array_elements(downloads) elem WHERE elem->>'id' != $2),
			'[]'::jsonb
		) WHERE username = $1`,
		[username, downloadId]
	);
}

async function pollUserDownloads(username: string, downloads: any[], realDebridService: any): Promise<{
	updated: number;
	completed: number;
	removed: number;
	errors: number;
}> {
	const updatedDownloads = [];
	let completed = 0;
	let removed = 0;
	let errors = 0;

	for (const download of downloads) {
		if (!download.id) {
			updatedDownloads.push(download);
			continue;
		}

		// Finished torrents: optionally heal stuck Real-Debrid landing URLs or missing links
		if (download.progress >= 100) {
			let entry = { ...download };
			const shouldHeal =
				!entry.link?.trim() || isRealDebridWebDownloadPage(entry.link);
			if (shouldHeal) {
				try {
					const torrentInfo = await realDebridService.getTorrentInfo(download.id);
					const apiLink = torrentInfo.links?.[0];
					if (apiLink && torrentDownloadLinkNeedsUnrestrict(entry.link, apiLink)) {
						const unrestricted = await realDebridService.unrestrictLink(apiLink);
						entry = {
							...entry,
							link: unrestricted.download || unrestricted.link
						};
						logWithTimestamp(`🔧 [${username}] Resolved direct link for ${entry.filename || download.id}`);
					}
				} catch (err) {
					if (err instanceof UnknownResourceError) {
						logWithTimestamp(
							`🗑️ [${username}] Completed torrent missing from Real-Debrid, removing: ${download.filename || download.id}`
						);
						try {
							await realDebridService.deleteTorrent(download.id);
						} catch {
							/* ignore */
						}
						try {
							await deleteDownloadById(username, download.id);
							removed++;
						} catch (dbError) {
							logWithTimestamp(`❌ [${username}] Error removing torrent ${download.id}: ${dbError}`, 'error');
							errors++;
						}
						continue;
					}
					logWithTimestamp(`⚠️ [${username}] Could not heal link for ${download.id}: ${err}`, 'warn');
				}
			}
			updatedDownloads.push(entry);
			continue;
		}

		try {
			const torrentInfo = await realDebridService.getTorrentInfo(download.id);

			const updatedDownload = {
				...download,
				progress: torrentInfo.progress || download.progress,
				status: torrentInfo.status || download.status,
				filename: torrentInfo.filename || download.filename,
				link: torrentInfo.links?.[0] || download.link || '',
				speed: torrentInfo.speed,
				seeders: torrentInfo.seeders
			};

			const wasCompleted = download.progress < 100 && torrentInfo.progress >= 100;

			if (
				torrentInfo.progress >= 100 &&
				torrentInfo.links?.[0] &&
				torrentDownloadLinkNeedsUnrestrict(download.link, torrentInfo.links[0])
			) {
				try {
					const unrestricted = await realDebridService.unrestrictLink(torrentInfo.links[0]);
					updatedDownload.link = unrestricted.download || unrestricted.link;
					if (wasCompleted) {
						logWithTimestamp(`✅ [${username}] Download completed: ${updatedDownload.filename || download.id}`);
						completed++;
					}
				} catch (err) {
					logWithTimestamp(`⚠️ [${username}] Failed to unrestrict link for ${download.id}: ${err}`, 'warn');
				}
			}

			updatedDownloads.push(updatedDownload);

			const progressChange = Math.abs((torrentInfo.progress || 0) - (download.progress || 0));
			if (progressChange >= 5 || torrentInfo.progress >= 100) {
				logWithTimestamp(
					`📈 [${username}] ${download.filename || download.id}: ${download.progress || 0}% → ${torrentInfo.progress || 0}%`
				);
			}
		} catch (error) {
			if (error instanceof UnknownResourceError) {
				logWithTimestamp(
					`🗑️ [${username}] Removing missing torrent: ${download.filename || download.id} (${download.id})`
				);
				try {
					await realDebridService.deleteTorrent(download.id);
				} catch (deleteError) {
					if (!(deleteError instanceof UnknownResourceError)) {
						logWithTimestamp(
							`⚠️ [${username}] Error attempting to delete missing torrent ${download.id}: ${deleteError}`,
							'warn'
						);
					}
				}
				try {
					await deleteDownloadById(username, download.id);
					removed++;
				} catch (dbError) {
					logWithTimestamp(`❌ [${username}] Error removing torrent ${download.id} from database: ${dbError}`, 'error');
					errors++;
				}
				continue;
			}
			logWithTimestamp(`❌ [${username}] Error polling torrent ${download.id}: ${error}`, 'error');
			errors++;
			updatedDownloads.push({
				...download,
				status: 'error'
			});
		}
	}

	// Update database if there were changes
	if (updatedDownloads.length !== downloads.length) {
		// Some downloads were removed
		await updateUserDownloads(username, updatedDownloads);
	} else {
		// Check if any downloads changed (including speed/seeders for better UX)
		const hasChanges = updatedDownloads.some((updated, index) => {
			const original = downloads[index];
			return (
				updated.progress !== original.progress ||
				updated.status !== original.status ||
				updated.link !== original.link ||
				updated.filename !== original.filename ||
				updated.speed !== original.speed ||
				updated.seeders !== original.seeders
			);
		});

		if (hasChanges) {
			await updateUserDownloads(username, updatedDownloads);
		}
	}

	return {
		updated: updatedDownloads.length,
		completed,
		removed,
		errors
	};
}

async function pollAllDownloads(triggeredByNotify = false) {
	if (isShuttingDown || isProcessing) {
		if (triggeredByNotify) {
			logWithTimestamp('⚠️ Poll cycle already in progress, skipping immediate poll');
		}
		return;
	}

	isProcessing = true;
	const cycleStart = Date.now();
	stats.cycleCount++;

	try {
		// Check database connection health
		if (!(await checkDatabaseConnection())) {
			logWithTimestamp('Database connection unhealthy, skipping this cycle', 'warn');
			return;
		}

		const realDebridAuth = process.env.REAL_DEBRID_AUTH || '';
		if (!realDebridAuth) {
			logWithTimestamp('REAL_DEBRID_AUTH environment variable is not set', 'error');
			return;
		}

		const realDebridService = createRealDebridService(realDebridAuth);
		const users = await getAllUsersWithDownloads();

		if (users.length === 0) {
			logWithTimestamp('No users with active downloads found');
			stats.lastCycleTime = Date.now() - cycleStart;
			return;
		}

		// Calculate total active downloads
		const totalActiveDownloads = users.reduce((sum, user) => {
			const downloads = Array.isArray(user.downloads) ? user.downloads : [];
			return sum + downloads.filter((d: any) => d.progress < 100 && d.id).length;
		}, 0);

		logWithTimestamp(`🔄 Starting poll cycle #${stats.cycleCount} - ${users.length} user(s), ${totalActiveDownloads} active download(s)`);

		// Reset cycle-specific stats
		let cycleCompleted = 0;
		let cycleRemoved = 0;
		let cycleErrors = 0;

		// Process users in parallel for better performance
		// Each user's downloads are independent, so this is safe
		const userPromises = users.map(async (user) => {
			try {
				const downloads = Array.isArray(user.downloads) ? user.downloads : [];
				if (downloads.length === 0) {
					return { completed: 0, removed: 0, errors: 0 };
				}

				const result = await pollUserDownloads(user.username, downloads, realDebridService);
				return result;
			} catch (error) {
				logWithTimestamp(`❌ Error polling downloads for user ${user.username}: ${error}`, 'error');
				cycleErrors++;
				return { completed: 0, removed: 0, errors: 1 };
			}
		});

		// Wait for all users to be processed
		const results = await Promise.all(userPromises);
		
		// Aggregate results
		results.forEach(result => {
			cycleCompleted += result.completed;
			cycleRemoved += result.removed;
			cycleErrors += result.errors;
		});

		// Update global stats
		stats.totalUsers = users.length;
		stats.totalDownloads = totalActiveDownloads;
		stats.completedDownloads += cycleCompleted;
		stats.removedDownloads += cycleRemoved;
		stats.errors += cycleErrors;
		stats.lastCycleTime = Date.now() - cycleStart;

		// Log cycle summary
		const summary = [
			`✅ Cycle #${stats.cycleCount} completed in ${(stats.lastCycleTime / 1000).toFixed(2)}s`,
			`📊 Completed: ${cycleCompleted} | Removed: ${cycleRemoved} | Errors: ${cycleErrors}`
		].join(' | ');
		
		logWithTimestamp(summary);

		// Log periodic statistics summary (every 10 cycles)
		if (stats.cycleCount % 10 === 0) {
			logWithTimestamp(
				`📈 Stats (last 10 cycles): ${stats.completedDownloads} completed, ${stats.removedDownloads} removed, ${stats.errors} errors | Avg cycle time: ${(stats.lastCycleTime / 1000).toFixed(2)}s`
			);
			// Reset counters for next period
			stats.completedDownloads = 0;
			stats.removedDownloads = 0;
			stats.errors = 0;
		}
	} catch (error) {
		stats.errors++;
		stats.lastCycleTime = Date.now() - cycleStart;
		logWithTimestamp(`❌ Error in poll cycle: ${error}`, 'error');
	} finally {
		isProcessing = false;
	}
}

// Immediate poll function (triggered by notifications)
function triggerImmediatePoll() {
	// Clear any existing timeout
	if (immediatePollTimeout) {
		clearTimeout(immediatePollTimeout);
	}

	// Debounce: wait a bit before polling (handles multiple rapid notifications)
	immediatePollTimeout = setTimeout(async () => {
		if (!isShuttingDown && !isProcessing) {
			logWithTimestamp('⚡ Triggering immediate poll cycle (notification received)');
			await pollAllDownloads(true);
		}
	}, IMMEDIATE_POLL_DELAY);
}

// Set up PostgreSQL LISTEN for real-time notifications
async function setupDatabaseNotifications() {
	const client = await pool.connect();
	
	try {
		// Listen for notifications on the 'new_download' channel
		await client.query('LISTEN new_download');
		logWithTimestamp('👂 Listening for database notifications...');

		// Handle notifications
		client.on('notification', (msg) => {
			if (msg.channel === 'new_download') {
				logWithTimestamp(`📬 Received notification: ${msg.payload || 'new download added'}`);
				triggerImmediatePoll();
			}
		});

		// Handle connection errors
		client.on('error', (err) => {
			logWithTimestamp(`❌ Database notification error: ${err}`, 'error');
			// Try to reconnect
			setTimeout(() => setupDatabaseNotifications(), 5000);
		});

		// Return client so we can close it on shutdown
		return client;
	} catch (error) {
		client.release();
		logWithTimestamp(`❌ Failed to setup database notifications: ${error}`, 'error');
		throw error;
	}
}

async function startWorker() {
	logWithTimestamp('🚀 Starting download worker service...');
	logWithTimestamp(`⏱️  Poll interval: ${POLL_INTERVAL / 1000} seconds`);
	logWithTimestamp(`💾 Database: ${getDbConfig().host}:${getDbConfig().port}/${getDbConfig().database}`);
	
	// Verify database connection on startup
	if (!(await checkDatabaseConnection())) {
		logWithTimestamp('❌ Database connection failed on startup. Retrying in 5 seconds...', 'error');
		await new Promise(resolve => setTimeout(resolve, 5000));
		if (!(await checkDatabaseConnection())) {
			logWithTimestamp('❌ Database connection failed again. Exiting.', 'error');
			process.exit(1);
		}
	}

	// Verify Real-Debrid auth on startup
	const realDebridAuth = process.env.REAL_DEBRID_AUTH || '';
	if (!realDebridAuth) {
		logWithTimestamp('❌ REAL_DEBRID_AUTH not configured. Exiting.', 'error');
		process.exit(1);
	}

	logWithTimestamp('✅ Worker initialized successfully');

	// Set up real-time database notifications
	let notificationClient;
	try {
		notificationClient = await setupDatabaseNotifications();
	} catch (error) {
		logWithTimestamp('⚠️ Could not setup database notifications, falling back to polling only', 'warn');
	}

	// Initial poll
	await pollAllDownloads();

	// Set up interval for continuous polling (backup in case notifications fail)
	const intervalId = setInterval(async () => {
		if (isShuttingDown) {
			clearInterval(intervalId);
			return;
		}
		await pollAllDownloads();
	}, POLL_INTERVAL);

	// Set up temp file cleanup - runs every hour
	const cleanupIntervalId = setInterval(() => {
		if (isShuttingDown) {
			clearInterval(cleanupIntervalId);
			return;
		}
		try {
			cleanupTempFiles();
		} catch (error) {
			logWithTimestamp(`⚠️ Error during temp file cleanup: ${error}`, 'warn');
		}
	}, 60 * 60 * 1000); // Every hour

	// Run initial cleanup on startup
	try {
		const stats = cleanupTempFiles();
		if (stats.deleted > 0) {
			logWithTimestamp(`🧹 Initial cleanup: Deleted ${stats.deleted} file(s), freed ${(stats.bytesFreed / (1024 * 1024)).toFixed(2)} MB`);
		}
	} catch (error) {
		logWithTimestamp(`⚠️ Error during initial cleanup: ${error}`, 'warn');
	}

	// Handle graceful shutdown
	const gracefulShutdown = async (signal: string) => {
		logWithTimestamp(`📴 Received ${signal}, shutting down gracefully...`);
		isShuttingDown = true;
		clearInterval(intervalId);
		clearInterval(cleanupIntervalId);
		
		// Clear immediate poll timeout
		if (immediatePollTimeout) {
			clearTimeout(immediatePollTimeout);
		}
		
		// Close notification listener
		if (notificationClient) {
			try {
				await notificationClient.query('UNLISTEN new_download');
				notificationClient.release();
			} catch (error) {
				logWithTimestamp(`⚠️ Error closing notification listener: ${error}`, 'warn');
			}
		}
		
		// Wait for current poll cycle to complete (with timeout)
		logWithTimestamp('⏳ Waiting for current cycle to complete...');
		await new Promise(resolve => setTimeout(resolve, 5000));
		
		try {
			await pool.end();
			logWithTimestamp('✅ Worker shut down successfully');
			process.exit(0);
		} catch (error) {
			logWithTimestamp(`❌ Error during shutdown: ${error}`, 'error');
			process.exit(1);
		}
	};

	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));

	// Handle uncaught errors
	process.on('unhandledRejection', (reason, promise) => {
		logWithTimestamp(`❌ Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
		stats.errors++;
	});

	process.on('uncaughtException', (error) => {
		logWithTimestamp(`❌ Uncaught exception: ${error}`, 'error');
		stats.errors++;
		// Don't exit on uncaught exceptions - let the worker continue
	});
}

// Start the worker
startWorker().catch((error) => {
	logWithTimestamp(`❌ Failed to start worker: ${error}`, 'error');
	process.exit(1);
});

