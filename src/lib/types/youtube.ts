// YouTube-related types
export interface YouTubeVideoInfo {
	id: string;
	title: string;
	description?: string;
	thumbnail?: string;
	duration?: number;
	channel?: {
		name: string;
		url?: string;
	};
	views?: number;
	uploadDate?: string;
	formats: YouTubeFormat[];
}

export interface YouTubeFormat {
	itag: number;
	quality: string;
	qualityLabel?: string;
	mimeType: string;
	hasVideo: boolean;
	hasAudio: boolean;
	fps?: number;
	bitrate?: number;
	url: string;
	contentLength?: number;
}

export interface YouTubeDownloadOptions {
	format?: string; // 'audio' | 'video'
	quality?: string; // '4k' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p'
	audioFormat?: 'mp3' | 'wav' | 'flac';
	audioBitrate?: number; // For MP3: 320, 256, 192, 128, etc.
}

export interface YouTubeDownloadProgress {
	percentage: number;
	downloaded: number;
	total: number;
	speed?: number;
}

