/**
 * [chaiwala-anime filler list](https://filler-list.chaiwala-anime.workers.dev/{slug})
 * — slug is typically the English title lowercased with punctuation → hyphens.
 */
import { config } from '$lib/config';

const UA = 'BakaWorld-X/1.0 (filler list)';

export function slugifyTitleForFillerList(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.replace(/:/g, ' ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function normalizeEpisodeOrder(v: string | number): string {
	const n = parseInt(String(v).trim(), 10);
	return Number.isFinite(n) ? String(n) : String(v).trim();
}

interface FillerListJson {
	fillerEpisodes?: (string | number)[];
}

async function fetchFillerSetForSlug(slug: string): Promise<{ set: Set<string>; ok: boolean }> {
	const set = new Set<string>();
	if (!slug || !config.fillerList.enabled) return { set, ok: false };

	const base = config.fillerList.baseUrl.replace(/\/$/, '');
	try {
		const res = await fetch(`${base}/${encodeURIComponent(slug)}`, {
			headers: { Accept: 'application/json', 'User-Agent': UA }
		});
		if (!res.ok) return { set, ok: false };
		const j = (await res.json()) as FillerListJson;
		for (const e of j.fillerEpisodes ?? []) {
			set.add(normalizeEpisodeOrder(e));
		}
		return { set, ok: true };
	} catch (e) {
		console.warn('animeFillerList: request failed', slug, e);
		return { set, ok: false };
	}
}

/**
 * Resolve filler episode numbers for an anime.
 * Tries title slug first, then Aniwatch `id` (e.g. `dragon-ball-daima`) if the first request did not succeed.
 */
export async function resolveFillerEpisodeOrders(
	title: string,
	aniwatchId: string
): Promise<Set<string>> {
	const titleSlug = slugifyTitleForFillerList(title);
	const primary = titleSlug || aniwatchId.toLowerCase();

	const first = await fetchFillerSetForSlug(primary);
	if (first.ok) return first.set;

	const fallback = aniwatchId.toLowerCase();
	if (fallback !== primary) {
		const second = await fetchFillerSetForSlug(fallback);
		if (second.ok) return second.set;
	}

	return new Set();
}
