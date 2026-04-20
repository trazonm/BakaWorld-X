import type { MovieEpisode, MovieServerOption } from '$lib/types/movie';

export function serverParamFromLabel(name: string | undefined | null): string {
	if (name == null || typeof name !== 'string') return 'vidcloud';
	const n = name.toLowerCase();
	if (n.includes('vidcloud')) return 'vidcloud';
	// FlixHQ often labels these UpCloud / MegaCloud / AKCloud — map to our Consumet-style `upcloud` value
	if (n.includes('upcloud') || n.includes('akcloud') || n.includes('megacloud') || n.includes('megacdn'))
		return 'upcloud';
	if (n.includes('mixdrop') || n.includes('mixcloud') || n.includes('mix cloud')) return 'mixdrop';
	return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || 'vidcloud';
}

export function pickPreferredServer(servers: MovieServerOption[]): string {
	if (!servers.length) return 'vidcloud';
	const params = servers
		.filter((s): s is MovieServerOption => s != null && typeof s === 'object' && typeof s.name === 'string')
		.map((s) => serverParamFromLabel(s.name));
	if (!params.length) return 'vidcloud';
	const hay = params.join(' ');
	if (hay.includes('vidcloud')) return 'vidcloud';
	if (hay.includes('upcloud')) return 'upcloud';
	if (hay.includes('mixdrop')) return 'mixdrop';
	return params[0];
}

/** Always offer these in the UI; Consumet watch supports vidcloud | upcloud | mixdrop. */
export const DEFAULT_MOVIE_SERVER_OPTIONS: { label: string; value: string }[] = [
	{ label: 'Vidcloud', value: 'vidcloud' },
	{ label: 'UpCloud', value: 'upcloud' },
	{ label: 'Mixdrop', value: 'mixdrop' }
];

/** Merge API-reported servers with defaults so the picker is never empty. */
export function mergeMovieServerOptions(servers: MovieServerOption[]): { label: string; value: string }[] {
	const seen = new Set<string>();
	const acc: { label: string; value: string }[] = [];
	for (const s of servers) {
		if (s == null || typeof s !== 'object' || typeof s.name !== 'string') continue;
		const value = serverParamFromLabel(s.name);
		if (seen.has(value)) continue;
		seen.add(value);
		acc.push({ label: s.name, value });
	}
	for (const d of DEFAULT_MOVIE_SERVER_OPTIONS) {
		if (seen.has(d.value)) continue;
		seen.add(d.value);
		acc.push(d);
	}
	return acc.length ? acc : [...DEFAULT_MOVIE_SERVER_OPTIONS];
}

/** Pull S/E from titles like `S01E03`, `1x03`, `S2 E5` when the API omits fields. */
export function parseSeasonEpisodeFromTitle(title: string): { season?: number; episode?: number } {
	const t = title.trim();
	const m1 = t.match(/\b[Ss](\d{1,2})\s*[Ee]?\s*(\d{1,3})\b/);
	if (m1) return { season: parseInt(m1[1], 10), episode: parseInt(m1[2], 10) };
	const m2 = t.match(/\b(\d{1,2})\s*[x×]\s*(\d{1,3})\b/);
	if (m2) return { season: parseInt(m2[1], 10), episode: parseInt(m2[2], 10) };
	return {};
}

/**
 * If Consumet returns `seasons: [{ season, episodes: [...] }, ...]`, flatten with season numbers.
 */
export function flattenConsumetSeasons(seasons: unknown): MovieEpisode[] | null {
	if (!Array.isArray(seasons) || seasons.length === 0) return null;
	const out: MovieEpisode[] = [];
	for (let si = 0; si < seasons.length; si++) {
		const block = seasons[si];
		if (!block || typeof block !== 'object') continue;
		const rec = block as Record<string, unknown>;
		let seasonNum: number | undefined;
		if (typeof rec.season === 'number' && !Number.isNaN(rec.season)) seasonNum = rec.season;
		else if (typeof rec.season === 'string') {
			const d = parseInt(rec.season.replace(/\D/g, ''), 10);
			seasonNum = Number.isNaN(d) ? undefined : d;
		} else if (typeof rec.seasonNumber === 'number' && !Number.isNaN(rec.seasonNumber)) {
			seasonNum = rec.seasonNumber;
		}
		if (seasonNum == null) seasonNum = si + 1;

		const epsRaw = rec.episodes;
		if (!Array.isArray(epsRaw)) continue;
		const normalized = normalizeMovieEpisodes(epsRaw);
		for (const ep of normalized) {
			out.push({ ...ep, season: ep.season ?? seasonNum });
		}
	}
	return out.length ? out : null;
}

/**
 * TV-only: flat episode list with repeating 1…n episode numbers per season and no `season` field.
 * When the episode number drops (e.g. …25 then 1), start a new season.
 */
export function inferSeasonsWhenNumbersRestart(episodes: MovieEpisode[]): MovieEpisode[] {
	if (episodes.length === 0) return episodes;
	let season = 1;
	let prev = -1;
	return episodes.map((e) => {
		const n = e.number ?? 0;
		if (prev >= 0 && n < prev) season += 1;
		prev = n;
		return { ...e, season };
	});
}

/**
 * Consumet sometimes omits `number`/`season` on movie episodes, or returns sparse arrays.
 * Invalid entries must be dropped or sortEpisodes will throw (surfacing as a 500 in +page.server).
 */
export function normalizeMovieEpisodes(episodes: unknown): MovieEpisode[] {
	if (!Array.isArray(episodes)) return [];
	const out: MovieEpisode[] = [];
	for (let i = 0; i < episodes.length; i++) {
		const e = episodes[i];
		if (e == null || typeof e !== 'object') continue;
		const rec = e as Record<string, unknown>;
		const id = rec.id != null ? String(rec.id).trim() : '';
		if (!id) continue;
		const title =
			typeof rec.title === 'string' && rec.title.trim() ? rec.title : `Episode ${i + 1}`;
		const url = typeof rec.url === 'string' ? rec.url : undefined;
		let season: number | undefined =
			typeof rec.season === 'number' && !Number.isNaN(rec.season) ? rec.season : undefined;
		if (season == null && typeof rec.season === 'string') {
			const ps = parseInt(rec.season.replace(/\D/g, ''), 10);
			if (!Number.isNaN(ps)) season = ps;
		}
		const rawNum = rec.number;
		let number: number;
		let hasExplicitNumber = false;
		if (typeof rawNum === 'number' && !Number.isNaN(rawNum)) {
			number = rawNum;
			hasExplicitNumber = true;
		} else if (typeof rawNum === 'string') {
			const p = parseInt(rawNum, 10);
			if (!Number.isNaN(p)) {
				number = p;
				hasExplicitNumber = true;
			} else {
				number = i + 1;
			}
		} else {
			number = i + 1;
		}
		const parsed = parseSeasonEpisodeFromTitle(title);
		if (season == null && parsed.season != null) season = parsed.season;
		if (!hasExplicitNumber && parsed.episode != null) number = parsed.episode;
		out.push({ id, title, url, season, number });
	}
	return out;
}

export function sortEpisodes(episodes: MovieEpisode[]): MovieEpisode[] {
	const safe = episodes.filter(
		(e): e is MovieEpisode =>
			e != null &&
			typeof e === 'object' &&
			typeof (e as MovieEpisode).id === 'string' &&
			(e as MovieEpisode).id.length > 0
	);
	return [...safe].sort((a, b) => {
		const sa = a.season ?? 0;
		const sb = b.season ?? 0;
		if (sa !== sb) return sa - sb;
		return (a.number ?? 0) - (b.number ?? 0);
	});
}
