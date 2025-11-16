// Spotify download progress endpoint (SSE)
import type { RequestHandler } from '@sveltejs/kit';
import { getProgress, deleteProgress } from '$lib/server/spotifyProgress';

export const GET: RequestHandler = async ({ url }) => {
	const progressId = url.searchParams.get('id');
	
	if (!progressId) {
		return new Response(JSON.stringify({ error: 'Progress ID required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
	});

	const stream = new ReadableStream({
		start(controller) {
			// Send initial connection message
			controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

			// Poll for progress updates
			const interval = setInterval(() => {
				const progress = getProgress(progressId);
				if (progress) {
					controller.enqueue(`data: ${JSON.stringify({
						type: 'progress',
						progress: progress.progress,
						stage: progress.stage
					})}\n\n`);
				}
			}, 500);

			// Clean up after 30 minutes or when client disconnects
			setTimeout(() => {
				clearInterval(interval);
				deleteProgress(progressId);
				controller.close();
			}, 30 * 60 * 1000);
		},
		cancel() {
			deleteProgress(progressId);
		}
	});

	return new Response(stream, { headers });
};

