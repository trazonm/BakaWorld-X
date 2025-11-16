// Spotify-related types
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
	format?: 'flac' | 'mp3';
	bitrate?: number; // For MP3: 320, 256, 192, 128
}

export interface SpotifyDownloadProgress {
	percentage: number;
	stage: string;
}

