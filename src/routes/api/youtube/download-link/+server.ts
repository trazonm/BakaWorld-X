// YouTube download endpoint - Simple, clean implementation
import type { RequestHandler } from '@sveltejs/kit';
import { createYouTubeService } from '$lib/services/youtubeService';
import { setProgress } from '$lib/server/youtubeProgress';
import path from 'path';

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

function buildDownloadName(title: string | undefined, fallback: string, ext: string): string {
	const base = (title || fallback).replace(INVALID_FILENAME_CHARS, '').trim() || fallback;
	return `${base}${ext}`;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url, format, quality, audioFormat, audioBitrate, progressId, title } = await request.json();

		if (!url || typeof url !== 'string') {
			return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
		}

		const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
		if (!youtubeRegex.test(url)) {
			return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), { status: 400 });
		}

		const youtubeService = createYouTubeService();
		const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

		// Progress callback
		const progressCallback = progressId ? (progress: number, stage: string) => {
			setProgress(progressId, progress, stage);
		} : undefined;

		if (format === 'video') {
			// Download video - wait for completion
			const filePath = await youtubeService.downloadVideoToFile(
				url,
				quality || '1080p',
				fileId,
				progressCallback
			);

			const ext = path.extname(filePath) || '.mp4';
			const fileName = buildDownloadName(title, 'youtube_video', ext);
			const downloadUrl = `/api/youtube/file/${fileId}?name=${encodeURIComponent(fileName)}`;
			return new Response(JSON.stringify({
				success: true,
				downloadUrl,
				filename: fileName
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		} else {
			const targetFormat: 'mp3' | 'wav' | 'flac' = (audioFormat as any) || 'mp3';
			const filePath = await youtubeService.downloadAudioToFile(
				url,
				targetFormat,
				audioBitrate,
				fileId,
				progressCallback
			);

			const ext = path.extname(filePath) || `.${targetFormat}`;
			const fileName = buildDownloadName(title, 'youtube_audio', ext);
			const downloadUrl = `/api/youtube/file/${fileId}?name=${encodeURIComponent(fileName)}`;
			return new Response(JSON.stringify({
				success: true,
				downloadUrl,
				filename: fileName
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	} catch (error) {
		console.error('Download error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
