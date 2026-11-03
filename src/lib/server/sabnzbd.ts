export type SabJob = {
	nzoId: string;
	filename: string;
	progress: number;
	status: string;
};

function sabSettings(): { baseUrl: string; apiKey: string } | null {
	const baseUrl = (process.env.SABNZBD_URL || '').replace(/\/$/, '');
	const apiKey = process.env.SABNZBD_API_KEY || '';
	if (!baseUrl || !apiKey) return null;
	return { baseUrl, apiKey };
}

export function sabnzbdConfigured(): boolean {
	return sabSettings() !== null;
}

async function sabGet(params: Record<string, string>): Promise<unknown> {
	const settings = sabSettings();
	if (!settings) return null;
	const url = new URL('/api', settings.baseUrl);
	url.searchParams.set('apikey', settings.apiKey);
	url.searchParams.set('output', 'json');
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
	if (!response.ok) {
		throw new Error(`SABnzbd ${response.status}`);
	}
	return response.json();
}

function asJobs(slots: unknown): SabJob[] {
	if (!Array.isArray(slots)) return [];
	return slots.flatMap((slot) => {
		if (!slot || typeof slot !== 'object') return [];
		const row = slot as { nzo_id?: string; filename?: string; percentage?: string | number; status?: string };
		if (!row.nzo_id) return [];
		const progress = Number(row.percentage);
		return [
			{
				nzoId: row.nzo_id,
				filename: row.filename || '',
				progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
				status: row.status || ''
			}
		];
	});
}

/** Queue plus recent history, keyed by SABnzbd nzo id. */
export async function sabJobSnapshot(): Promise<Map<string, SabJob>> {
	const jobs = new Map<string, SabJob>();
	if (!sabSettings()) return jobs;
	const [queue, history] = await Promise.all([
		sabGet({ mode: 'queue', limit: '100' }),
		sabGet({ mode: 'history', limit: '50' })
	]);
	const queueSlots = (queue as { queue?: { slots?: unknown } } | null)?.queue?.slots;
	const historySlots = (history as { history?: { slots?: unknown } } | null)?.history?.slots;
	for (const job of asJobs(historySlots)) {
		const completed = /complete/i.test(job.status);
		jobs.set(job.nzoId, {
			...job,
			progress: completed ? 100 : job.progress
		});
	}
	for (const job of asJobs(queueSlots)) jobs.set(job.nzoId, job);
	return jobs;
}

export async function addNzbFromUrl(downloadUrl: string, name: string): Promise<string> {
	const settings = sabSettings();
	if (!settings) throw new Error('SABnzbd is not configured');
	const nzb = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000) });
	if (!nzb.ok) throw new Error(`Could not fetch the nzb (${nzb.status})`);
	const bytes = await nzb.arrayBuffer();
	const filename = name.toLowerCase().endsWith('.nzb') ? name : `${name || 'release'}.nzb`;
	const form = new FormData();
	form.append('name', new Blob([bytes], { type: 'application/x-nzb' }), filename.slice(0, 180));
	form.append('mode', 'addfile');
	form.append('output', 'json');
	form.append('apikey', settings.apiKey);
	const response = await fetch(new URL('/api', settings.baseUrl), {
		method: 'POST',
		body: form,
		signal: AbortSignal.timeout(30_000)
	});
	const payload = (await response.json().catch(() => ({}))) as { status?: boolean; nzo_ids?: string[]; error?: string };
	if (!response.ok || payload.status === false) {
		throw new Error(payload.error || `SABnzbd rejected the nzb (${response.status})`);
	}
	const nzoId = payload.nzo_ids?.[0];
	if (!nzoId) throw new Error('SABnzbd did not return a queue id');
	return nzoId;
}
