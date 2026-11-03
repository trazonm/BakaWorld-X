export type ReleaseProtocol = 'torrent' | 'usenet';

export type ReleaseHit = {
	Guid: string;
	Title: string;
	Size: number;
	Seeders: number;
	Link: string;
	MagnetUri?: string;
	protocol: ReleaseProtocol;
	indexer?: string;
	indexerId?: number;
	grab?: Record<string, unknown>;
};

export type ReleaseSearchSources = {
	jackett: 'ok' | 'error' | 'unconfigured';
	prowlarr: 'ok' | 'error' | 'unconfigured';
};

const DEFAULT_JACKETT_URL = 'https://jackett-service.gleeze.com';
const SEARCH_TIMEOUT_MS = 22_000;

export function indexerOrigin(raw: string | undefined, fallback = ''): string {
	const value = (raw || fallback).trim().replace(/\/$/, '');
	if (!value) return '';
	try {
		return new URL(value).origin;
	} catch {
		return value;
	}
}

/** Point Jackett download links at the configured server, including the old LAN address. */
export function rewriteJackettLink(link: string, jackettUrl?: string): string {
	if (!link) return link;
	const origin = indexerOrigin(jackettUrl, DEFAULT_JACKETT_URL);
	return link
		.replace(/https?:\/\/192\.168\.0\.107:9117/g, origin)
		.replace(/https?:\/\/jackett-service\.gleeze\.com/g, origin);
}

function asNumber(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

function magnetHash(magnet: string | undefined): string {
	if (!magnet) return '';
	const match = magnet.match(/btih:([a-z0-9]+)/i);
	return match ? match[1].toLowerCase() : '';
}

export function normalizeJackettResults(payload: { Results?: unknown[] } | null, jackettUrl?: string): ReleaseHit[] {
	const rows = Array.isArray(payload?.Results) ? payload.Results : [];
	const hits: ReleaseHit[] = [];
	for (const row of rows) {
		if (!row || typeof row !== 'object') continue;
		const item = row as Record<string, unknown>;
		const title = String(item.Title || '').trim();
		if (!title) continue;
		const link = rewriteJackettLink(String(item.Link || ''), jackettUrl);
		const magnet = item.MagnetUri ? rewriteJackettLink(String(item.MagnetUri), jackettUrl) : undefined;
		hits.push({
			Guid: String(item.Guid || link || title),
			Title: title,
			Size: asNumber(item.Size),
			Seeders: asNumber(item.Seeders),
			Link: link,
			MagnetUri: magnet,
			protocol: 'torrent',
			indexer: String(item.Tracker || item.indexer || 'Jackett')
		});
	}
	return dedupeTorrents(hits);
}

export function normalizeProwlarrUsenet(rows: unknown[]): ReleaseHit[] {
	const hits: ReleaseHit[] = [];
	for (const row of rows) {
		if (!row || typeof row !== 'object') continue;
		const item = row as Record<string, unknown>;
		const protocol = String(item.protocol || '').toLowerCase();
		if (protocol && protocol !== 'usenet') continue;
		const title = String(item.title || item.Title || '').trim();
		const guid = String(item.guid || item.Guid || '');
		const downloadUrl = String(item.downloadUrl || item.downloadurl || '');
		if (!title || (!guid && !downloadUrl)) continue;
		const indexerId = asNumber(item.indexerId);
		hits.push({
			Guid: guid || downloadUrl,
			Title: title,
			Size: asNumber(item.size || item.Size),
			Seeders: 0,
			Link: downloadUrl,
			protocol: 'usenet',
			indexer: String(item.indexer || 'Prowlarr'),
			indexerId: indexerId || undefined,
			grab: {
				guid,
				indexerId,
				title,
				downloadUrl,
				protocol: 'usenet',
				size: asNumber(item.size || item.Size)
			}
		});
	}
	return hits;
}

function dedupeTorrents(hits: ReleaseHit[]): ReleaseHit[] {
	const best = new Map<string, ReleaseHit>();
	const passthrough: ReleaseHit[] = [];
	for (const hit of hits) {
		const hash = magnetHash(hit.MagnetUri);
		if (!hash) {
			passthrough.push(hit);
			continue;
		}
		const current = best.get(hash);
		if (!current || hit.Seeders > current.Seeders) best.set(hash, hit);
	}
	return [...best.values(), ...passthrough].sort((a, b) => b.Seeders - a.Seeders || b.Size - a.Size);
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = SEARCH_TIMEOUT_MS): Promise<unknown> {
	const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}
	return response.json();
}

export async function searchJackett(query: string, baseUrl: string, apiKey: string): Promise<ReleaseHit[]> {
	const url = new URL('/api/v2.0/indexers/all/results', baseUrl.replace(/\/$/, '') || DEFAULT_JACKETT_URL);
	url.searchParams.set('apikey', apiKey);
	url.searchParams.set('Query', query);
	const payload = (await fetchJson(url.toString(), { headers: { Accept: 'application/json' } })) as {
		Results?: unknown[];
	};
	return normalizeJackettResults(payload, baseUrl);
}

export async function searchProwlarrUsenet(query: string, baseUrl: string, apiKey: string): Promise<ReleaseHit[]> {
	const url = new URL('/api/v1/search', baseUrl.replace(/\/$/, ''));
	url.searchParams.set('query', query);
	url.searchParams.set('type', 'search');
	const payload = await fetchJson(url.toString(), {
		headers: { Accept: 'application/json', 'X-Api-Key': apiKey }
	});
	return normalizeProwlarrUsenet(Array.isArray(payload) ? payload : []);
}

export async function grabProwlarrRelease(
	baseUrl: string,
	apiKey: string,
	grab: Record<string, unknown>
): Promise<void> {
	const endpoint = new URL('/api/v1/search', baseUrl.replace(/\/$/, ''));
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Api-Key': apiKey
		},
		body: JSON.stringify(grab),
		signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
	});
	if (response.ok) return;

	const downloadUrl = typeof grab.downloadUrl === 'string' ? grab.downloadUrl : '';
	if (!downloadUrl) {
		throw new Error(`Prowlarr grab failed: ${response.status} ${response.statusText}`);
	}
	const fallback = await fetch(downloadUrl, {
		headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
		signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
	});
	if (!fallback.ok) {
		throw new Error(`Prowlarr grab failed: ${fallback.status} ${fallback.statusText}`);
	}
}
