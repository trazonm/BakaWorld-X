// Spotify URLs → metadata → YouTube audio (yt-dlp + ffmpeg), SpotDL-style

/** Output: 128 / 320 kbps MP3 or FLAC container (source is usually lossy from YouTube). */
export const SPOTIFY_DOWNLOAD_QUALITIES = ['mp3-128', 'mp3-320', 'flac'] as const;

export type SpotifyDownloadQuality = (typeof SPOTIFY_DOWNLOAD_QUALITIES)[number];

export interface SpotifyTrackInfo {
	id: string;
	title: string;
	artist: string;
	artists: string[];
	album: string;
	albumArt?: string;
	duration?: number;
	releaseDate?: string;
	externalUrls: {
		spotify?: string;
	};
}

export interface SpotifyDownloadOptions {
	format?: SpotifyDownloadQuality | 'mp3' | 'flac' | (string & {});
	bitrate?: number;
}

export interface SpotifyDownloadProgress {
	percentage: number;
	stage: string;
}
