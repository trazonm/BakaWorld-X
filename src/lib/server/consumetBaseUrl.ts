import { env } from '$env/dynamic/private';

/** Local default when `CONSUMET_BASE_URL` is unset (development only). */
const DEV_FALLBACK = 'http://192.168.0.107:6000';
/** Host gateway added in docker-compose (`extra_hosts`). Port 6000 is the Consumet container publish. */
const DOCKER_HOST_FALLBACK = 'http://host.docker.internal:6000';

/**
 * Base URL for the Consumet-compatible API (movies/TV metadata + watch).
 * Production reaches the host's published Consumet port. Do not use the browser
 * `fetch` for that port — it is on the WHATWG bad-port list, so the service uses `http.request`.
 */
export function getConsumetBaseUrl(): string {
	const fromEnv = (env.CONSUMET_BASE_URL || process.env.CONSUMET_BASE_URL || '').trim();
	if (fromEnv) return fromEnv.replace(/\/$/, '');
	if (process.env.NODE_ENV === 'production') return DOCKER_HOST_FALLBACK;
	return DEV_FALLBACK;
}
