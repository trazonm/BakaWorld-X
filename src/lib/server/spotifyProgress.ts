// Spotify download progress store (server-side)
// Simple in-memory progress store (use Redis/database for production)

interface ProgressData {
	progress: number;
	stage: string;
	timestamp: number;
}

const progressStore = new Map<string, ProgressData>();

// Clean up old progress entries (older than 5 minutes)
setInterval(() => {
	const now = Date.now();
	for (const [id, data] of progressStore.entries()) {
		if (now - data.timestamp > 5 * 60 * 1000) {
			progressStore.delete(id);
		}
	}
}, 60000); // Run every minute

export function setProgress(id: string, progress: number, stage: string): void {
	progressStore.set(id, { progress, stage, timestamp: Date.now() });
}

export function getProgress(id: string): { progress: number; stage: string } | null {
	const data = progressStore.get(id);
	if (!data) return null;
	return { progress: data.progress, stage: data.stage };
}

export function deleteProgress(id: string): void {
	progressStore.delete(id);
}

