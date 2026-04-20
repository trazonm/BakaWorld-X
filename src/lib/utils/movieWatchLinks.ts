import type { ConsumetMovieInfo, MovieEpisode, MovieServerOption } from '$lib/types/movie';

function isAjaxApiUrl(u: string): boolean {
	return /\/ajax\//i.test(u);
}

function serverMatchesPreference(serverName: string, preference: string): boolean {
	const p = preference.toLowerCase().trim();
	const n = serverName.toLowerCase();
	if (p === 'vidcloud') return n.includes('vidcloud') || n.includes('vid cloud');
	if (p === 'upcloud')
		return (
			n.includes('upcloud') ||
			n.includes('up cloud') ||
			n.includes('megacloud') ||
			n.includes('akcloud') ||
			n.includes('mega cdn')
		);
	if (p === 'mixdrop')
		return n.includes('mixdrop') || n.includes('mix drop') || n.includes('mixcloud') || n.includes('mix cloud');
	return n.replace(/\s/g, '').includes(p.replace(/\s/g, ''));
}

/**
 * Human watch page on the catalog site (e.g. flixhq.to/watch-tv/...).
 * Avoids episode.url when it is only an XHR path like /ajax/v2/episode/servers/...
 */
export function pickBrowserProviderWatchUrl(
	servers: MovieServerOption[],
	selectedServer: string,
	movie: ConsumetMovieInfo,
	episode: MovieEpisode
): string {
	const preferred = servers.find((s) => serverMatchesPreference(s.name, selectedServer));
	const ordered = preferred
		? [preferred, ...servers.filter((s) => s !== preferred)]
		: [...servers];

	for (const row of ordered) {
		const u = row.url?.trim();
		if (u && /^https:\/\//i.test(u) && !isAjaxApiUrl(u)) return u;
	}

	const mu = movie.url?.trim();
	if (mu && /^https:\/\//i.test(mu) && !isAjaxApiUrl(mu)) return mu;

	const eu = episode.url?.trim();
	if (eu && /^https:\/\//i.test(eu) && !isAjaxApiUrl(eu)) return eu;

	return '';
}
