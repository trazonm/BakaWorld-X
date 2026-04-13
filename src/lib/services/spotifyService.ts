// Spotify link → track metadata → YouTube (yt-dlp) → MP3/FLAC — no Deezer account
import type { SpotifyTrackInfo, SpotifyDownloadOptions } from '$lib/types/spotify';
import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';
import { createYouTubeService } from '$lib/services/youtubeService';

const TEMP_DIR = path.join(process.cwd(), 'temp', 'spotify');

if (!fs.existsSync(TEMP_DIR)) {
	fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let tokenCache: { accessToken: string; expiresAtMs: number } | null = null;

function extractTrackId(url: string): string | null {
	const patterns = [/spotify\.com\/track\/([a-zA-Z0-9]+)/, /spotify:track:([a-zA-Z0-9]+)/];
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}
	return null;
}

function openTrackUrl(trackId: string, url: string): string {
	if (url.includes('open.spotify.com')) return url.split('?')[0] ?? url;
	return `https://open.spotify.com/track/${trackId}`;
}

async function getClientCredentialsToken(): Promise<string | null> {
	const clientId = env.SPOTIFY_CLIENT_ID?.trim();
	const clientSecret = env.SPOTIFY_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret) return null;

	if (tokenCache && Date.now() < tokenCache.expiresAtMs - 30_000) {
		return tokenCache.accessToken;
	}

	const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});

	if (!res.ok) return null;

	const data = (await res.json()) as { access_token: string; expires_in: number };
	tokenCache = {
		accessToken: data.access_token,
		expiresAtMs: Date.now() + data.expires_in * 1000
	};
	return data.access_token;
}

async function fetchTrackFromWebApi(trackId: string, pageUrl: string): Promise<SpotifyTrackInfo | null> {
	const token = await getClientCredentialsToken();
	if (!token) return null;

	const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) return null;

	const t = (await res.json()) as {
		name: string;
		artists: { name: string }[];
		album: { name: string; images?: { url: string }[] };
		duration_ms: number;
		external_urls?: { spotify?: string };
	};

	const artists = t.artists?.map((a) => a.name).filter(Boolean) ?? [];
	const primary = artists[0] || 'Unknown';
	const images = t.album?.images ?? [];
	const albumArt = images[0]?.url;

	return {
		id: trackId,
		title: t.name || 'Unknown',
		artist: primary,
		artists: artists.length ? artists : [primary],
		album: t.album?.name || '',
		albumArt,
		duration: t.duration_ms != null ? Math.round(t.duration_ms / 1000) : undefined,
		releaseDate: undefined,
		externalUrls: {
			spotify: t.external_urls?.spotify ?? pageUrl
		}
	};
}

/**
 * Public embed page ships `__NEXT_DATA__` with artists, title, art — no API keys.
 * (Web API is still preferred when configured: richer album data.)
 */
async function fetchTrackFromEmbed(trackId: string, pageUrl: string): Promise<SpotifyTrackInfo | null> {
	const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
	const res = await fetch(embedUrl, {
		headers: {
			Accept: 'text/html,application/xhtml+xml',
			'User-Agent': 'Mozilla/5.0 (compatible; BakaWorld/1.0; +https://open.spotify.com)'
		}
	});
	if (!res.ok) return null;

	const html = await res.text();
	const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
	if (!m?.[1]) return null;

	let root: unknown;
	try {
		root = JSON.parse(m[1]);
	} catch {
		return null;
	}

	const props = (root as { props?: { pageProps?: { state?: { data?: { entity?: unknown } } } } })?.props
		?.pageProps;
	const entity = props?.state?.data?.entity as
		| {
				type?: string;
				name?: string;
				title?: string;
				artists?: { name?: string }[];
				duration?: number;
				releaseDate?: { isoString?: string };
				album?: { name?: string };
				visualIdentity?: { image?: { url?: string }[] };
		  }
		| undefined;

	if (!entity || entity.type !== 'track') return null;

	const artists = (entity.artists ?? []).map((a) => a.name).filter((n): n is string => Boolean(n));
	const primary = artists[0] || 'Unknown';
	const title = entity.title || entity.name || 'Unknown';
	const images = entity.visualIdentity?.image ?? [];
	const albumArt = images[0]?.url;
	const durationMs = typeof entity.duration === 'number' ? entity.duration : undefined;

	return {
		id: trackId,
		title,
		artist: primary,
		artists: artists.length ? artists : [primary],
		album: entity.album?.name ?? '',
		albumArt,
		duration: durationMs != null ? Math.round(durationMs / 1000) : undefined,
		releaseDate: entity.releaseDate?.isoString?.slice(0, 10),
		externalUrls: { spotify: pageUrl }
	};
}

async function fetchTrackFromOembed(pageUrl: string, trackId: string): Promise<SpotifyTrackInfo> {
	const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(pageUrl)}`);
	if (!res.ok) {
		throw new Error('Could not read track info from Spotify (oEmbed failed).');
	}
	const data = (await res.json()) as { title: string; thumbnail_url?: string };
	const title = data.title || 'Unknown';
	return {
		id: trackId,
		title,
		artist: 'Unknown',
		artists: ['Unknown'],
		album: '',
		albumArt: data.thumbnail_url,
		duration: undefined,
		releaseDate: undefined,
		externalUrls: { spotify: pageUrl }
	};
}

async function resolveSpotifyTrack(url: string): Promise<SpotifyTrackInfo> {
	const trackId = extractTrackId(url);
	if (!trackId) throw new Error('Invalid Spotify URL');
	const pageUrl = openTrackUrl(trackId, url);

	const fromApi = await fetchTrackFromWebApi(trackId, pageUrl);
	if (fromApi) return fromApi;

	const fromEmbed = await fetchTrackFromEmbed(trackId, pageUrl);
	if (fromEmbed) return fromEmbed;

	return fetchTrackFromOembed(pageUrl, trackId);
}

function buildYoutubeSearchQuery(info: SpotifyTrackInfo): string {
	const knownArtists = info.artists.filter((a) => a && a !== 'Unknown');
	const artistPart = knownArtists.join(' ');
	let q: string;
	if (artistPart) {
		q = `${artistPart} ${info.title} audio`;
	} else {
		q = `${info.title} official audio`;
	}
	q = q.replace(/\s+/g, ' ').trim();
	if (q.length > 180) q = q.slice(0, 180).trim();
	return q;
}

function resolveAudio(options: SpotifyDownloadOptions): { format: 'mp3' | 'flac'; bitrate?: number } {
	const f = options.format;
	if (f === 'flac' || f === 'FLAC') return { format: 'flac' };
	if (f === 'mp3-128' || f === 'MP3_96' || (options.bitrate && options.bitrate <= 128)) {
		return { format: 'mp3', bitrate: 128 };
	}
	if (typeof f === 'string' && (f.startsWith('OGG') || f.startsWith('MP4'))) {
		return { format: 'mp3', bitrate: 320 };
	}
	return { format: 'mp3', bitrate: 320 };
}

export class SpotifyService {
	async getTrackInfo(url: string): Promise<SpotifyTrackInfo> {
		return resolveSpotifyTrack(url);
	}

	async downloadTrackToFile(
		url: string,
		options: SpotifyDownloadOptions,
		fileId: string,
		progressCallback?: (progress: number, stage: string) => void
	): Promise<string> {
		const trackId = extractTrackId(url);
		if (!trackId) {
			throw new Error('Invalid Spotify URL');
		}

		if (progressCallback) progressCallback(5, 'Resolving track…');
		const meta = await resolveSpotifyTrack(url);

		const { format, bitrate } = resolveAudio(options);
		const query = buildYoutubeSearchQuery(meta);
		const ytsearchUrl = `ytsearch1:${query}`;

		if (progressCallback) progressCallback(12, 'Searching YouTube…');

		const youtube = createYouTubeService();
		const baseName = `spotify-${fileId}`;

		return youtube.downloadAudioToFile(
			ytsearchUrl,
			format,
			bitrate,
			fileId,
			(p, stage) => {
				if (progressCallback) {
					progressCallback(Math.min(100, Math.round(12 + p * 0.88)), stage);
				}
			},
			{ workDir: TEMP_DIR, baseName }
		);
	}
}

export function createSpotifyService(): SpotifyService {
	return new SpotifyService();
}
