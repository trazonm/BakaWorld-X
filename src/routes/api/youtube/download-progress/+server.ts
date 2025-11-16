// YouTube download progress endpoint (SSE)
import type { RequestHandler } from '@sveltejs/kit';
import { getProgress, deleteProgress } from '$lib/server/youtubeProgress';

export const GET: RequestHandler = async ({ url, request }) => {
	const progressId = url.searchParams.get('id');
	
	if (!progressId) {
		return new Response(JSON.stringify({ error: 'Progress ID required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			let isClosed = false;
			
			// Send connection message
			try {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
			} catch (err) {
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
						const data = encoder.encode(`data: ${JSON.stringify({
							type: 'progress',
							progress: progress.progress,
							stage: progress.stage
						})}\n\n`);
						
						try {
							controller.enqueue(data);
							
							if (progress.progress >= 100) {
								clearInterval(interval);
								setTimeout(() => {
									deleteProgress(progressId);
									if (!isClosed) {
										isClosed = true;
										try {
											controller.close();
										} catch (e) {
											// Already closed
										}
									}
								}, 1000);
							}
						} catch (err) {
							// Controller closed
							isClosed = true;
							clearInterval(interval);
						}
					}
				} catch (error) {
					// Error getting progress, continue
				}
			}, 500);

			// Cleanup on disconnect
			request.signal?.addEventListener('abort', () => {
				if (!isClosed) {
					isClosed = true;
					clearInterval(interval);
					deleteProgress(progressId);
					try {
						controller.close();
					} catch (e) {
						// Already closed
					}
				}
			});

			// Timeout after 10 minutes
			setTimeout(() => {
				if (!isClosed) {
					isClosed = true;
					clearInterval(interval);
					deleteProgress(progressId);
					try {
						controller.close();
					} catch (e) {
						// Already closed
					}
				}
			}, 10 * 60 * 1000);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};
