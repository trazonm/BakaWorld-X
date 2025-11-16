// YouTube download endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createYouTubeService } from '$lib/services/youtubeService';
import type { YouTubeDownloadOptions } from '$lib/types/youtube';
import { Readable } from 'stream';
import { setProgress } from '$lib/server/youtubeProgress';

export const POST: RequestHandler = async ({ request }) => {
	// Check authentication (optional, based on your requirements)
	const session = getSessionUser(request);
	// Uncomment if you want to require authentication:
	// if (!session) {
	// 	return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	// }

	try {
		const { url, format, quality, audioFormat, audioBitrate, progressId } = await request.json();

		if (!url || typeof url !== 'string') {
			return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
		}

		// Validate YouTube URL
		const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
		if (!youtubeRegex.test(url)) {
			return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), { status: 400 });
		}

		const options: YouTubeDownloadOptions = {
			format: format || 'video',
			quality,
			audioFormat,
			audioBitrate: audioBitrate ? parseInt(audioBitrate.toString(), 10) : undefined
		};

		const youtubeService = createYouTubeService();
		let stream: Readable;
		
		// Progress callback if progressId is provided
		const progressCallback = progressId ? (progress: number, stage: string) => {
			setProgress(progressId, progress, stage);
		} : undefined;
		
		try {
			stream = await youtubeService.downloadVideo(url, options, progressCallback);
			console.log('YouTube download stream created successfully');
		} catch (error) {
			console.error('Error creating YouTube download stream:', error);
			if (progressId) {
				setProgress(progressId, 0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
			throw error;
		}

		// Determine content type and filename
		let contentType = 'application/octet-stream';
		let filename = 'download';
		let extension = '';

		if (options.format === 'audio') {
			if (options.audioFormat === 'mp3') {
				contentType = 'audio/mpeg';
				extension = '.mp3';
			} else if (options.audioFormat === 'wav') {
				contentType = 'audio/wav';
				extension = '.wav';
			} else if (options.audioFormat === 'flac') {
				contentType = 'audio/flac';
				extension = '.flac';
			}
		} else {
			contentType = 'video/mp4';
			extension = '.mp4';
		}

		// Convert Node.js Readable stream to Web ReadableStream
		let bytesSent = 0;
		const webStream = new ReadableStream({
			start(controller) {
				console.log('Web stream started, listening for data...');
				
				stream.on('data', (chunk: Buffer) => {
					try {
						bytesSent += chunk.length;
						controller.enqueue(new Uint8Array(chunk));
					} catch (error) {
						console.error('Error enqueueing chunk:', error);
						// Stream may have been cancelled
						stream.destroy();
					}
				});

				stream.on('end', () => {
					console.log(`Stream ended. Total bytes sent: ${bytesSent}`);
					if (progressId) {
						setProgress(progressId, 100, 'Streaming complete');
					}
					controller.close();
				});

				stream.on('error', (error: Error) => {
					console.error('Stream error:', error);
					controller.error(error);
				});
			},
			cancel() {
				console.log('Web stream cancelled');
				// Clean up the Node.js stream if the web stream is cancelled
				stream.destroy();
			}
		});

		return new Response(webStream, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="youtube${extension}"`,
				'Cache-Control': 'no-cache'
			}
		});
	} catch (error) {
		console.error('Error downloading YouTube video:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};

