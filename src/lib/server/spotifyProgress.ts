// Spotify download progress store (server-side)
const progressStore = new Map<string, { progress: number; stage: string }>();

export function setProgress(id: string, progress: number, stage: string): void {
	progressStore.set(id, { progress, stage });
}

export function getProgress(id: string): { progress: number; stage: string } | null {
	return progressStore.get(id) || null;
}

export function deleteProgress(id: string): void {
	progressStore.delete(id);
}

