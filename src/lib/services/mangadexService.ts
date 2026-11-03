// MangaDex catalog. Used when the Mangapill scraper returns nothing.
import type { MangapillChapter, MangapillMangaInfo, MangapillSearchResponse } from './mangapillService';

const API = 'https://api.mangadex.org';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MdRelationship = { type?: string; attributes?: { fileName?: string } };
type MdManga = {
	id: string;
	attributes?: {
		title?: Record<string, string>;
		description?: Record<string, string>;
		year?: number | null;
		status?: string;
		tags?: Array<{ attributes?: { name?: Record<string, string> } }>;
	};
	relationships?: MdRelationship[];
};
type MdChapter = {
	id: string;
	attributes?: {
		chapter?: string | null;
		title?: string | null;
		translatedLanguage?: string;
		pages?: number;
		externalUrl?: string | null;
	};
};

export function isMangadexId(id: string | undefined | null): boolean {
	return UUID.test(String(id || '').trim());
}

/** Page loads prefix Mangapill ids. MangaDex uuids must be unwrapped before lookup. */
export function unwrapCatalogId(raw: string, prefix: 'manga' | 'chapters'): string {
	let id = raw || '';
	try {
		id = decodeURIComponent(id);
	} catch {
		/* already decoded */
	}
	const lead = `${prefix}/`;
	const body = id.startsWith(lead) ? id.slice(lead.length) : id;
	const first = body.split('/')[0] || '';
	if (isMangadexId(first)) return first;
	return id;
}

function preferredText(map: Record<string, string> | undefined): string {
	if (!map) return '';
	return map.en || map['ja-ro'] || Object.values(map).find((value) => value?.trim()) || '';
}

function coverUrl(manga: MdManga): string {
	const cover = manga.relationships?.find((item) => item.type === 'cover_art');
	const file = cover?.attributes?.fileName;
	if (!file) return '';
	return `https://uploads.mangadex.org/covers/${manga.id}/${file}.256.jpg`;
}

async function mdGet(path: string): Promise<unknown> {
	const response = await fetch(`${API}${path}`, {
		headers: { Accept: 'application/json', 'User-Agent': 'BakaWorld-X/1.0' },
		signal: AbortSignal.timeout(20_000)
	});
	if (!response.ok) {
		throw new Error(`MangaDex error: ${response.status}`);
	}
	return response.json();
}

export async function searchMangadex(query: string): Promise<MangapillSearchResponse> {
	const url = new URL(`${API}/manga`);
	url.searchParams.set('title', query);
	url.searchParams.set('limit', '24');
	url.searchParams.set('offset', '0');
	url.searchParams.append('includes[]', 'cover_art');
	url.searchParams.set('order[relevance]', 'desc');
	for (const rating of ['safe', 'suggestive']) url.searchParams.append('contentRating[]', rating);
	const response = await fetch(url, {
		headers: { Accept: 'application/json', 'User-Agent': 'BakaWorld-X/1.0' },
		signal: AbortSignal.timeout(20_000)
	});
	if (!response.ok) throw new Error(`MangaDex error: ${response.status}`);
	const payload = (await response.json()) as { data?: MdManga[]; total?: number };
	const rows = Array.isArray(payload.data) ? payload.data : [];
	return {
		results: rows.map((manga) => ({
			id: manga.id,
			title: preferredText(manga.attributes?.title) || 'Untitled',
			image: coverUrl(manga),
			type: 'manga',
			year: manga.attributes?.year ? String(manga.attributes.year) : '',
			status: manga.attributes?.status || ''
		})),
		currentPage: 1,
		hasNextPage: (payload.total || 0) > rows.length,
		totalPages: 1
	};
}

export async function getMangadexInfo(mangaId: string): Promise<MangapillMangaInfo> {
	const payload = (await mdGet(`/manga/${mangaId}?includes[]=cover_art`)) as { data?: MdManga };
	const manga = payload.data;
	if (!manga?.id) throw new Error('Manga not found');
	const chapters = await listEnglishChapters(manga.id);
	const genres = (manga.attributes?.tags || [])
		.map((tag) => preferredText(tag.attributes?.name))
		.filter(Boolean)
		.slice(0, 12);
	return {
		id: manga.id,
		title: preferredText(manga.attributes?.title) || 'Untitled',
		description: preferredText(manga.attributes?.description),
		image: coverUrl(manga),
		type: 'manga',
		status: manga.attributes?.status || '',
		year: manga.attributes?.year ? String(manga.attributes.year) : '',
		genres,
		chapters
	};
}

function chapterFeedUrl(mangaId: string, offset: number): string {
	const url = new URL(`${API}/manga/${mangaId}/feed`);
	url.searchParams.append('translatedLanguage[]', 'en');
	url.searchParams.set('order[chapter]', 'asc');
	url.searchParams.set('limit', '500');
	url.searchParams.set('offset', String(offset));
	url.searchParams.append('includes[]', 'scanlation_group');
	for (const rating of ['safe', 'suggestive', 'erotica', 'pornographic']) {
		url.searchParams.append('contentRating[]', rating);
	}
	return `${url.pathname}${url.search}`;
}

async function listEnglishChapters(mangaId: string): Promise<MangapillChapter[]> {
	const byNumber = new Map<string, MangapillChapter>();
	let offset = 0;
	for (let page = 0; page < 4; page++) {
		const payload = (await mdGet(chapterFeedUrl(mangaId, offset))) as { data?: MdChapter[]; total?: number };
		const rows = Array.isArray(payload.data) ? payload.data : [];
		for (const row of rows) {
			if (!row.id) continue;
			const externalUrl = row.attributes?.externalUrl?.trim() || '';
			const pages = row.attributes?.pages ?? 0;
			if (!externalUrl && pages === 0) continue;
			const number = row.attributes?.chapter?.trim() || row.id;
			const name = row.attributes?.title?.trim();
			const entry: MangapillChapter = {
				id: row.id,
				title: name ? `Chapter ${number}: ${name}` : `Chapter ${number}`,
				...(externalUrl ? { externalUrl } : {})
			};
			const previous = byNumber.get(number);
			// Prefer a chapter this app can render over a publisher link for the same number.
			if (!previous || (previous.externalUrl && !entry.externalUrl)) byNumber.set(number, entry);
		}
		offset += rows.length;
		if (!rows.length || offset >= (payload.total || 0)) break;
	}
	return [...byNumber.values()];
}

export async function getMangadexPages(chapterId: string): Promise<{ pages: { page: number; image: string }[] }> {
	let payload: { baseUrl?: string; chapter?: { hash?: string; data?: string[] } };
	try {
		payload = (await mdGet(`/at-home/server/${chapterId}`)) as typeof payload;
	} catch (error) {
		const message = error instanceof Error ? error.message : '';
		if (message.includes('404')) throw new Error('This chapter has no pages on MangaDex');
		throw error;
	}
	const hash = payload.chapter?.hash;
	const files = payload.chapter?.data || [];
	if (!payload.baseUrl || !hash || !files.length) {
		throw new Error('This chapter has no pages');
	}
	return {
		pages: files.map((file, index) => ({
			page: index + 1,
			image: `${payload.baseUrl}/data/${hash}/${file}`
		}))
	};
}
