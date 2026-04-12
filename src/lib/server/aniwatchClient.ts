/**
 * Client for the Aniwatch JSON API (see https://github.com/codex0555/Aniwatch-Api).
 * Used for catalog search + episode lists; MegaPlay `s-2` needs the numeric `?ep=` id from episode payloads.
 */
import { config } from '$lib/config';
import type { Anime, Episode } from '$lib/types/anime';
import { resolveFillerEpisodeOrders } from '$lib/server/animeFillerList';

const UA = 'BakaWorld-X/1.0 (anime catalog)';

function aniwatchBase(): string {
	return config.aniwatch.baseUrl.replace(/\/$/, '');
}

async function aniwatchFetch(path: string): Promise<Response> {
	const url = `${aniwatchBase()}${path.startsWith('/') ? path : `/${path}`}`;
	return fetch(url, {
		headers: { Accept: 'application/json', 'User-Agent': UA }
	});
}

export interface AniwatchSearchRow {
	name: string;
	jname: string;
	format: string;
	duration: string;
	idanime: string;
	sub: string | number;
	dubani: string | number | false;
	totalep: string | number | false;
	img: string;
	pg?: string | false;
}

function parseCount(v: string | number | false | undefined): number {
	if (v === false || v == null) return 0;
	const n = parseInt(String(v), 10);
	return Number.isFinite(n) ? n : 0;
}

export function mapAniwatchSearchToAnime(row: AniwatchSearchRow): Anime {
	return {
		id: row.idanime,
		title: row.name,
		url: '',
		image: row.img,
		duration: row.duration || '',
		watchList: '',
		japaneseTitle: row.jname,
		type: row.format || 'TV',
		nsfw: row.pg === '18+',
		sub: parseCount(row.sub),
		dub: parseCount(row.dubani as string | number),
		episodes: row.totalep === false ? 0 : parseCount(row.totalep as string | number)
	};
}

export async function aniwatchSearch(query: string, page: number): Promise<{
	currentPage: number;
	hasNextPage: boolean;
	totalPages: number;
	results: Anime[];
}> {
	const res = await aniwatchFetch(`/api/search/${encodeURIComponent(query)}/${page}`);
	if (!res.ok) {
		throw new Error(`Aniwatch search failed: ${res.status} ${res.statusText}`);
	}
	const data = (await res.json()) as {
		searchYour?: AniwatchSearchRow[];
		nextpageavailable?: boolean;
	};
	const rows = data.searchYour ?? [];
	const hasNext = Boolean(data.nextpageavailable);
	return {
		currentPage: page,
		hasNextPage: hasNext,
		totalPages: hasNext ? page + 1 : page,
		results: rows.map(mapAniwatchSearchToAnime)
	};
}

function mergeInfoX(infoX: unknown): Record<string, unknown> {
	const merged: Record<string, unknown> = {};
	if (!Array.isArray(infoX)) return merged;
	for (const el of infoX) {
		if (el && typeof el === 'object' && !Array.isArray(el)) {
			Object.assign(merged, el as Record<string, unknown>);
		}
	}
	return merged;
}

function extractEpIdNumber(epId: string): string | undefined {
	const m = String(epId).match(/(?:\?|&)ep=(\d+)/i);
	return m ? m[1] : undefined;
}

export async function aniwatchGetAnimeDetail(id: string): Promise<Record<string, unknown>> {
	const [relatedRes, episodeRes] = await Promise.all([
		aniwatchFetch(`/api/related/${encodeURIComponent(id)}`),
		aniwatchFetch(`/api/episode/${encodeURIComponent(id)}`)
	]);

	if (!relatedRes.ok) {
		throw new Error(`Aniwatch related failed: ${relatedRes.status} ${relatedRes.statusText}`);
	}

	const relatedJson = (await relatedRes.json()) as {
		infoX?: unknown[];
		mal_id?: string | number;
	};
	const merged = mergeInfoX(relatedJson.infoX);

	const subN = parseCount(merged.epsub as string | number | undefined);
	const dubN = parseCount(merged.epdub as string | number | undefined);
	const totalEp = parseCount(merged.totalep as string | number | undefined);

	const displayTitle = String(merged.name || id);
	const fillerOrders = await resolveFillerEpisodeOrders(displayTitle, id);

	const episodes: Episode[] = [];
	if (episodeRes.ok) {
		const epJson = (await episodeRes.json()) as {
			episodetown?: Record<string, unknown>[];
		};
		const seriesHasSub = subN > 0;
		const seriesHasDub = dubN > 0;

		for (const raw of epJson.episodetown ?? []) {
			const ep = raw as { order: string; name: string; epId: string };
			const aniwatchEp = extractEpIdNumber(ep.epId) ?? String(ep.order);

			const fillerRaw = raw.filler ?? raw.isFiller ?? raw.fillerEp;
			const inlineFiller =
				fillerRaw === true ||
				String(fillerRaw).toLowerCase() === 'true' ||
				String(fillerRaw) === '1';
			const ord = parseInt(String(ep.order), 10);
			const fromList =
				fillerOrders.size > 0 && Number.isFinite(ord) && fillerOrders.has(String(ord));

			episodes.push({
				id: aniwatchEp,
				title: ep.name,
				number: String(ep.order),
				url: ep.epId,
				// Aniwatch list has no per-episode sub/dub; mirror series caps from /api/related
				isSubbed: seriesHasSub,
				isDubbed: seriesHasDub,
				isFiller: inlineFiller || fromList
			});
		}
	}

	const genres = Array.isArray(merged.genre) ? (merged.genre as string[]) : [];

	const malRaw = relatedJson.mal_id ?? merged.mal_id;
	const malId =
		malRaw != null && String(malRaw).trim() !== '' ? parseInt(String(malRaw), 10) : undefined;

	return {
		id: (merged.id as string) || id,
		title: (merged.name as string) || id,
		japaneseTitle: (merged.jname as string) || (merged.japanese as string),
		url: '',
		image: (merged.image as string) || '',
		description: (merged.desc as string) || '',
		genres,
		type: (merged.format as string) || 'TV',
		status: (merged.statusAnime as string) || '',
		season: (merged.premired as string) || (merged.aired as string) || '',
		totalEpisodes: totalEp || episodes.length,
		episodes,
		duration: (merged.duration as string) || '',
		watchList: '',
		nsfw: false,
		sub: subN,
		dub: dubN,
		hasSub: subN > 0,
		hasDub: dubN > 0,
		...(malId != null && Number.isFinite(malId) && malId > 0 ? { malId } : {}),
		aniwatchId: id
	};
}
