import * as cheerio from 'cheerio';
import { getFlixhqWatchReferer } from '$lib/server/flixhqEmbed';

/** Hosts we allow server-side fetch for (SSRF guard; align with CSP frame-src). */
const ALLOWED_HOST_SUFFIXES = [
	'rabbitstream.net',
	'mixdrop.co',
	'dokicloud.one',
	'megacloud.club',
	'streameeeeee.site'
];

export function isAllowedThirdPartyEmbedHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	for (const s of ALLOWED_HOST_SUFFIXES) {
		if (h === s || h.endsWith('.' + s)) return true;
	}
	return false;
}

function normalizeCandidate(raw: string, pageUrl: string): string | null {
	let u = raw.trim().replace(/^["']|["']$/g, '');
	if (!u.includes('.m3u8')) return null;
	u = u.replace(/\\\//g, '/').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
	try {
		const abs = new URL(u, pageUrl).href;
		if (abs.startsWith('https://') || abs.startsWith('http://')) return abs;
	} catch {
		/* skip */
	}
	return null;
}

/**
 * Best-effort: find an HLS master URL in third-party embed HTML (often present as JSON or literals).
 * Many players load playlists only after JS runs; extraction fails then and callers should fall back.
 */
export function extractM3u8FromEmbedHtml(html: string, pageUrl: string): string | null {
	const candidates: string[] = [];
	const seen = new Set<string>();

	const push = (raw: string) => {
		const abs = normalizeCandidate(raw, pageUrl);
		if (abs && !seen.has(abs)) {
			seen.add(abs);
			candidates.push(abs);
		}
	};

	try {
		const $ = cheerio.load(html);
		$('source[src*="m3u8"], source[type*="mpegurl"], source[type*="apple"]').each((_, el) => {
			const src = $(el).attr('src');
			if (src) push(src);
		});
	} catch {
		/* non-fatal */
	}

	const patterns = [
		/https?:\/\/[^\s"'<>()\\]+\.m3u8[^\s"'<>()\\]*/gi,
		/https?:\\\/\\\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi
	];
	for (const re of patterns) {
		let m: RegExpExecArray | null;
		while ((m = re.exec(html)) !== null) {
			push(m[0].replace(/\\\//g, '/'));
		}
	}

	return candidates[0] ?? null;
}

export async function tryFetchHlsFromEmbedPage(
	embedUrl: string,
	mediaId: string
): Promise<{ m3u8: string; pageUrl: string } | null> {
	let page: URL;
	try {
		page = new URL(embedUrl);
	} catch {
		return null;
	}
	if (page.protocol !== 'https:' && page.protocol !== 'http:') return null;
	if (!isAllowedThirdPartyEmbedHost(page.hostname)) return null;

	const referer = getFlixhqWatchReferer(mediaId);
	const r = await fetch(embedUrl, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9',
			Referer: referer,
			'X-Requested-With': 'XMLHttpRequest'
		},
		redirect: 'follow'
	});
	if (!r.ok) return null;
	const html = await r.text();
	const pageUrl = r.url || embedUrl;
	const m3u8 = extractM3u8FromEmbedHtml(html, pageUrl);
	if (!m3u8) return null;
	return { m3u8, pageUrl };
}
