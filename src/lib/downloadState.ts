/** Pure download-state helpers shared by the worker, poll API, and the downloads UI. */

const TERMINAL_TORRENT_STATUS = /^(error|magnet_error|virus|dead|infringing_file)$/i;
const PERMANENT_LINK_ERROR = /infringing_file|file_unavailable|hoster_unsupported|unsupported_hoster/i;

export function isUsenetId(id: unknown): boolean {
	return typeof id === 'string' && id.startsWith('usenet:');
}

export function isTerminalTorrentStatus(status: unknown): boolean {
	return TERMINAL_TORRENT_STATUS.test(String(status || '').trim());
}

export function isPermanentLinkError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error || '');
	return PERMANENT_LINK_ERROR.test(message);
}

export function asEpoch(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

export function shouldDeferRemotePoll(download: { pollAfter?: unknown } | null | undefined, now = Date.now()): boolean {
	if (!download) return false;
	return now < asEpoch(download.pollAfter);
}

export function shouldDeferLinkHeal(download: { healAfter?: unknown } | null | undefined, now = Date.now()): boolean {
	if (!download) return false;
	return now < asEpoch(download.healAfter);
}

/** Backoff for a torrent Real-Debrid has already marked failed. */
export function terminalStatusDelayMs(attempts: number): number {
	const steps = [5 * 60_000, 30 * 60_000, 6 * 60 * 60_000];
	const index = Math.min(Math.max(attempts, 1), steps.length) - 1;
	return steps[index];
}

/** Backoff after a link-heal or poll exception. Permanent copyright errors wait much longer. */
export function retryDelayMs(attempts: number, permanent: boolean): number {
	if (permanent) {
		const steps = [60 * 60_000, 6 * 60 * 60_000];
		const index = Math.min(Math.max(attempts, 1), steps.length) - 1;
		return steps[index];
	}
	const steps = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
	const index = Math.min(Math.max(attempts, 1), steps.length) - 1;
	return steps[index];
}

export function isRealDebridLandingLink(url?: string | null): boolean {
	if (!url?.trim()) return false;
	return /https?:\/\/(?:www\.)?real-debrid\.com\/d\//i.test(url.trim());
}

type DownloadView = {
	id?: string;
	status?: string;
	linkError?: string;
	progress?: number;
	link?: string | null;
	protocol?: string;
};

export function downloadProblem(download: DownloadView | null | undefined): string | null {
	if (!download || download.protocol === 'usenet' || isUsenetId(download.id)) return null;
	const linkError = download.linkError?.trim() || '';
	const status = (download.status || '').trim();
	if (/infringing/i.test(linkError) || /infringing/i.test(status)) {
		return 'Real-Debrid blocked this file';
	}
	if (linkError && isPermanentLinkError(linkError)) {
		return 'Real-Debrid cannot download this file';
	}
	if (isTerminalTorrentStatus(status) && (download.progress ?? 0) < 100) {
		if (status.toLowerCase() === 'virus') return 'Real-Debrid flagged this file';
		if (status.toLowerCase() === 'dead' || status.toLowerCase() === 'magnet_error') {
			return 'Torrent is not available';
		}
		return 'Download failed';
	}
	if ((download.progress ?? 0) >= 100 && isRealDebridLandingLink(download.link) && linkError) {
		return 'Direct link is not ready';
	}
	return null;
}

export function hasDirectDownload(download: DownloadView | null | undefined): boolean {
	if (!download?.link?.trim()) return false;
	if ((download.progress ?? 0) < 100) return false;
	if (isRealDebridLandingLink(download.link)) return false;
	if (download.linkError?.trim()) return false;
	return true;
}
