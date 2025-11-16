// Spotify download endpoint - Simple, clean implementation
import type { RequestHandler } from '@sveltejs/kit';
import { createSpotifyService } from '$lib/services/spotifyService';
import { setProgress } from '$lib/server/spotifyProgress';
import type { SpotifyDownloadOptions } from '$lib/types/spotify';
import path from 'path';

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

function buildDownloadName(title: string | undefined, artist: string | undefined, ext: string): string {
	const name = artist && title ? `${artist} - ${title}` : (title || 'spotify_track');
	const base = name.replace(INVALID_FILENAME_CHARS, '').trim() || 'spotify_track';
	return `${base}${ext}`;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url, format, bitrate, progressId, title, artist } = await request.json();

		if (!url || typeof url !== 'string') {
			return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
		}

		const spotifyRegex = /^(https?:\/\/)?(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+|spotify:track:[a-zA-Z0-9]+/;
		if (!spotifyRegex.test(url)) {
			return new Response(JSON.stringify({ error: 'Invalid Spotify URL' }), { status: 400 });
		}

		const spotifyService = createSpotifyService();
		const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

		// Progress callback
		const progressCallback = progressId ? (progress: number, stage: string) => {
			setProgress(progressId, progress, stage);
		} : undefined;

		const options: SpotifyDownloadOptions = {
			format: (format || 'flac') as 'flac' | 'mp3',
			bitrate: bitrate || (format === 'mp3' ? 320 : undefined)
		};

		// Download track - wait for completion (uses spotdl with YouTube Music as source)
		const filePath = await spotifyService.downloadTrackToFile(
			url,
			options,
			fileId,
			progressCallback
		);

		const ext = path.extname(filePath) || `.${options.format}`;
		const fileName = buildDownloadName(title, artist, ext);
		const downloadUrl = `/api/spotify/file/${fileId}?name=${encodeURIComponent(fileName)}`;
		
		return new Response(JSON.stringify({
			success: true,
			downloadUrl,
			filename: fileName
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Download error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

