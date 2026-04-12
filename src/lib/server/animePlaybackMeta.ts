/** Resolve MegaPlay meta embed params from Consumet-style anime / episode payloads. */

function pickPositiveInt(...values: unknown[]): number | undefined {
	for (const v of values) {
		if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
		if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
	}
	return undefined;
}

export function extractAnimeExternalIds(data: Record<string, unknown>): {
	malId?: number;
	anilistId?: number;
} {
	let malId = pickPositiveInt(
		data.malId,
		data.mal_id,
		data.malID,
		data.idMal,
		data.id_mal
	);
	let anilistId = pickPositiveInt(
		data.anilistId,
		data.anilist_id,
		data.anilistID,
		data.idAnilist,
		data.id_anilist,
		data.alId
	);

	const tracking = data.tracking;
	if (tracking && typeof tracking === 'object') {
		const t = tracking as Record<string, unknown>;
		malId ??= pickPositiveInt(t.malId, t.mal_id, t.mal, t.idMal);
		anilistId ??= pickPositiveInt(t.anilistId, t.anilist_id, t.anilist, t.idAnilist);
	}

	return { malId, anilistId };
}

/**
 * Episode index for MegaPlay MAL/AniList URLs (1-based).
 * Prefer API `number`, else parse `$ep=N` from AnimeKai-style episode ids.
 */
export function parseEpisodeNumberFromEpisode(ep: {
	number?: string | number;
	id?: string;
}): number | undefined {
	if (ep.number != null) {
		const n = Number(ep.number);
		if (Number.isFinite(n) && n >= 1) return Math.floor(n);
	}
	if (ep.id && typeof ep.id === 'string') {
		const m = ep.id.match(/\$ep=(\d+)/i);
		if (m) {
			const n = parseInt(m[1], 10);
			if (Number.isFinite(n) && n >= 1) return n;
		}
	}
	return undefined;
}
