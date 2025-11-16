// Spotify track info endpoint
import type { RequestHandler } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/session';
import { createSpotifyService } from '$lib/services/spotifyService';

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

		// Validate Spotify URL
		const spotifyRegex = /^(https?:\/\/)?(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+|spotify:track:[a-zA-Z0-9]+/;
		if (!spotifyRegex.test(url)) {
			return new Response(JSON.stringify({ error: 'Invalid Spotify URL' }), { status: 400 });
		}

		const spotifyService = createSpotifyService();
		const trackInfo = await spotifyService.getTrackInfo(url);

		return new Response(JSON.stringify(trackInfo), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('Error getting Spotify track info:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};

