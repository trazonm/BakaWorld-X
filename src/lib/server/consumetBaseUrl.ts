import { env } from '$env/dynamic/private';

/** Local default when `CONSUMET_BASE_URL` is unset (development only). */
const DEV_FALLBACK = 'http://192.168.0.107:6000';

/**
 * Base URL for the Consumet-compatible API (movies/TV/anime metadata + watch).
 * In production, set `CONSUMET_BASE_URL` to a URL your app server can reach (not a LAN IP).
 */
export function getConsumetBaseUrl(): string {
	const fromEnv = env.CONSUMET_BASE_URL?.trim();
	if (fromEnv) return fromEnv.replace(/\/$/, '');

	if (process.env.NODE_ENV === 'production') {
		console.warn(
			'[consumet] CONSUMET_BASE_URL is not set; using dev fallback. Movie/TV APIs will fail unless this host is reachable from the container.'
		);
	}
	return DEV_FALLBACK;
}
