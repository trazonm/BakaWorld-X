/**
 * Resolve FlixHQ embed URLs when Consumet /watch fails.
 * Paths must match the official flow (not /ajax/sources — that 404s):
 * - Movies: GET /ajax/episode/list/{numeric_id} → server rows → GET /ajax/episode/sources/{server_id} → JSON.link
 * - TV: GET /ajax/episode/servers/{episode_id} → same sources path
 * @see https://github.com/eatmynerds/flixhq-embed
 */
import * as cheerio from 'cheerio';

const FLIXHQ_ORIGIN = 'https://flixhq.to';

function flixhqHeaders(referer: string): HeadersInit {
	return {
		'User-Agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.9',
		Referer: referer,
		'X-Requested-With': 'XMLHttpRequest'
	};
}

/** Public watch URL for this title (Referer FlixHQ expects). */
function flixhqWatchReferer(mediaId: string): string {
	const path = mediaId
		.split('/')
		.filter(Boolean)
		.map((s) => encodeURIComponent(s))
		.join('/');
	return `${FLIXHQ_ORIGIN}/${path}`;
}

/** Trailing numeric id from slug, e.g. movie/watch-foo-57468 → 57468 */
function numericMovieListId(mediaId: string, episodeId: string): string {
	const m = mediaId.match(/-(\d+)$/);
	if (m) return m[1];
	const e = episodeId.trim();
	if (/^\d+$/.test(e)) return e;
	throw new Error('Could not resolve this title for playback (missing id).');
}

async function fetchFlixhqText(path: string, referer: string): Promise<string> {
	const url = path.startsWith('http') ? path : `${FLIXHQ_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
	const r = await fetch(url, { headers: flixhqHeaders(referer) });
	if (!r.ok) {
		throw new Error(`Stream request failed: ${r.status} ${r.statusText} (${path})`);
	}
	return r.text();
}

export interface FlixhqServerRow {
	id: string;
	name: string;
}

function parseServerRows(html: string): FlixhqServerRow[] {
	const $ = cheerio.load(html);
	const rows: FlixhqServerRow[] = [];
	$('.nav > .nav-item').each((_, el) => {
		const a = $(el).find('a').first();
		const id = (a.attr('data-linkid') || a.attr('data-id'))?.trim();
		const name =
			a.find('span').first().text().trim() ||
			a.attr('title')?.trim() ||
			a.text().trim();
		if (id && name) rows.push({ id, name });
	});
	return rows;
}

function hintMatchesServer(hint: string, serverName: string): boolean {
	const h = hint.toLowerCase();
	const n = serverName.toLowerCase();
	if (h === 'vidcloud') return n.includes('vidcloud') || n.includes('vid cloud');
	// Avoid matching "mega" alone — too broad. Match explicit host-style names only.
	if (h === 'upcloud')
		return (
			n.includes('upcloud') ||
			n.includes('up cloud') ||
			n.includes('megacloud') ||
			n.includes('megacdn') ||
			n.includes('akcloud')
		);
	if (h === 'mixdrop')
		return (
			n.includes('mixdrop') ||
			n.includes('mix drop') ||
			n.includes('mixcloud') ||
			n.includes('mix cloud')
		);
	return n.includes(h);
}

async function fetchEmbedLinkForServerId(serverId: string, referer: string): Promise<string> {
	const text = await fetchFlixhqText(
		`/ajax/episode/sources/${encodeURIComponent(serverId)}`,
		referer
	);
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error('Stream host returned an invalid response for this episode.');
	}
	const link =
		parsed &&
		typeof parsed === 'object' &&
		'link' in parsed &&
		typeof (parsed as { link: unknown }).link === 'string'
			? (parsed as { link: string }).link.trim()
			: '';
	if (!link) throw new Error('Stream link missing in host response.');
	return link;
}

/**
 * @param preferredOrder e.g. ['vidcloud','upcloud','mixdrop'] or a single server from the UI
 * @param allowAnyServerFallback When false (single explicit pick), do not fall back to other rows in page order — avoids "Mixdrop" silently becoming UpCloud
 */
export async function resolveFlixhqEmbedUrl(
	episodeId: string,
	mediaId: string,
	preferredOrder: string[],
	allowAnyServerFallback: boolean = preferredOrder.length > 1
): Promise<{ embedUrl: string; serverLabel: string }> {
	const isMovie = mediaId.toLowerCase().includes('movie');
	const referer = flixhqWatchReferer(mediaId);

	const listPath = isMovie
		? `/ajax/episode/list/${encodeURIComponent(numericMovieListId(mediaId, episodeId))}`
		: `/ajax/episode/servers/${encodeURIComponent(episodeId)}`;

	const html = await fetchFlixhqText(listPath, referer);
	const rows = parseServerRows(html);
	if (!rows.length) {
		throw new Error('No streaming servers found for this title.');
	}

	const hints =
		preferredOrder.length > 0
			? [...new Set(preferredOrder.map((s) => s.toLowerCase().trim()).filter(Boolean))]
			: ['vidcloud', 'upcloud', 'mixdrop'];

	let lastErr: Error | undefined;

	for (const hint of hints) {
		const row = rows.find((r) => hintMatchesServer(hint, r.name));
		if (!row) continue;
		try {
			const embedUrl = await fetchEmbedLinkForServerId(row.id, referer);
			return { embedUrl, serverLabel: row.name };
		} catch (e) {
			lastErr = e instanceof Error ? e : new Error(String(e));
		}
	}

	if (!allowAnyServerFallback) {
		const want = hints.join(', ');
		throw lastErr ?? new Error(`No stream matched "${want}" for this title.`);
	}

	for (const row of rows) {
		try {
			const embedUrl = await fetchEmbedLinkForServerId(row.id, referer);
			return { embedUrl, serverLabel: row.name };
		} catch (e) {
			lastErr = e instanceof Error ? e : new Error(String(e));
		}
	}

	throw lastErr ?? new Error('Could not start playback for this title.');
}
