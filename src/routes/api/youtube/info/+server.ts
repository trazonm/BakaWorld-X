// YouTube video info endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createYouTubeService } from '$lib/services/youtubeService';

export const POST: RequestHandler = async ({ request }) => {
	// Check authentication (optional, based on your requirements)
	const session = getSessionUser(request);
	// Uncomment if you want to require authentication:
	// if (!session) {
	// 	return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	// }

	try {
		const { url } = await request.json();

		if (!url || typeof url !== 'string') {
			return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
		}

		// Validate YouTube URL
		const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
		if (!youtubeRegex.test(url)) {
			return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), { status: 400 });
		}

		const youtubeService = createYouTubeService();
		const videoInfo = await youtubeService.getVideoInfo(url);

		return new Response(JSON.stringify(videoInfo), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('Error getting YouTube video info:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};

