import type { Pool } from 'pg';

export type DownloadRecord = {
	id: string;
	filename?: string;
	progress?: number;
	status?: string;
	link?: string;
	guid?: string;
	added?: string;
	protocol?: string;
	misses?: number;
	[key: string]: unknown;
};

export function isUsenetDownload(download: { id?: string; protocol?: string } | null | undefined): boolean {
	if (!download) return false;
	if (download.protocol === 'usenet') return true;
	return typeof download.id === 'string' && download.id.startsWith('usenet:');
}

/** Drop a torrent only after repeated misses, and never in the first 90s after it was added. */
export function shouldDropMissingTorrent(download: { added?: string }, misses: number): boolean {
	const addedMs = download.added ? Date.parse(download.added) : NaN;
	const age = Number.isFinite(addedMs) ? Date.now() - addedMs : Number.POSITIVE_INFINITY;
	return misses >= 3 && age > 90_000;
}

export function numericProgress(value: unknown, fallback = 0): number {
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(0, Math.min(100, n));
}

/**
 * Apply a poll snapshot onto the latest saved list.
 * Rows added while the poll was in flight stay put.
 * Rows the user removed during the poll are not resurrected.
 */
export function applyPollSnapshot(
	latest: DownloadRecord[],
	polled: DownloadRecord[],
	dropIds: Set<string>
): DownloadRecord[] {
	const polledById = new Map(polled.map((item) => [item.id, item]));
	return latest.flatMap((item) => {
		if (!item?.id || dropIds.has(item.id)) return [];
		const patch = polledById.get(item.id);
		if (!patch) return [item];
		return [
			{
				...item,
				progress: patch.progress ?? item.progress,
				status: patch.status || item.status,
				filename: patch.filename || item.filename,
				link: patch.link || item.link,
				speed: patch.speed ?? item.speed,
				seeders: patch.seeders ?? item.seeders,
				misses: patch.misses ?? item.misses,
				linkError: patch.linkError !== undefined ? patch.linkError : item.linkError,
				healAfter: patch.healAfter !== undefined ? patch.healAfter : item.healAfter,
				healAttempts: patch.healAttempts !== undefined ? patch.healAttempts : item.healAttempts,
				pollAfter: patch.pollAfter !== undefined ? patch.pollAfter : item.pollAfter,
				pollAttempts: patch.pollAttempts !== undefined ? patch.pollAttempts : item.pollAttempts
			}
		];
	});
}

export async function mutateDownloadsWithPool<T>(
	pool: Pool,
	username: string,
	mutate: (downloads: DownloadRecord[]) => { downloads: DownloadRecord[]; result?: T }
): Promise<T | undefined> {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const res = await client.query(
			'SELECT downloads FROM users WHERE LOWER(username) = LOWER($1) FOR UPDATE',
			[username]
		);
		if (!res.rows[0]) {
			throw new Error('User not found');
		}
		const current = Array.isArray(res.rows[0].downloads) ? res.rows[0].downloads : [];
		const { downloads, result } = mutate(current);
		await client.query('UPDATE users SET downloads = $1::jsonb WHERE LOWER(username) = LOWER($2)', [
			JSON.stringify(downloads),
			username
		]);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		try {
			await client.query('ROLLBACK');
		} catch {
			/* connection already closed */
		}
		throw error;
	} finally {
		client.release();
	}
}
