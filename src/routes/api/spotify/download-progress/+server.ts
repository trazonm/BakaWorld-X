// Spotify download progress endpoint (SSE)
import type { RequestHandler } from '@sveltejs/kit';
import { getProgress, deleteProgress } from '$lib/server/spotifyProgress';

export const GET: RequestHandler = async ({ url, request }) => {
	const progressId = url.searchParams.get('id');

	if (!progressId) {
		return new Response(JSON.stringify({ error: 'Progress ID required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			let isClosed = false;

			try {
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
				);
			} catch {
				isClosed = true;
				return;
			}

			const interval = setInterval(() => {
				if (isClosed) {
					clearInterval(interval);
					return;
				}

				try {
					const progress = getProgress(progressId);
					if (progress) {
						const chunk = encoder.encode(
							`data: ${JSON.stringify({
								type: 'progress',
								progress: progress.progress,
								stage: progress.stage
							})}\n\n`
						);
						try {
							controller.enqueue(chunk);
							if (progress.progress >= 100) {
								clearInterval(interval);
								setTimeout(() => {
									deleteProgress(progressId);
									if (!isClosed) {
										isClosed = true;
										try {
											controller.close();
										} catch {
											// already closed
										}
									}
								}, 1000);
							}
						} catch {
							isClosed = true;
							clearInterval(interval);
						}
					}
				} catch {
					// continue polling
				}
			}, 500);

			request.signal?.addEventListener('abort', () => {
				if (!isClosed) {
					isClosed = true;
					clearInterval(interval);
					deleteProgress(progressId);
					try {
						controller.close();
					} catch {
						// already closed
					}
				}
			});

			setTimeout(() => {
				if (!isClosed) {
					isClosed = true;
					clearInterval(interval);
					deleteProgress(progressId);
					try {
						controller.close();
					} catch {
						// already closed
					}
				}
			}, 30 * 60 * 1000);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
