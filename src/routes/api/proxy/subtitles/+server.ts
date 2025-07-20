import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const subtitleUrl = url.searchParams.get('url');
	const referer = url.searchParams.get('referer') || 'https://megacloudforest.xyz/';

	if (!subtitleUrl) {
		return new Response('Missing subtitle URL', { status: 400 });
	}

	console.log('Proxying subtitle request to:', subtitleUrl);

	try {
		const response = await fetch(subtitleUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Referer': referer,
				'Origin': 'https://megacloudforest.xyz/',
				'Accept': '*/*',
				'Accept-Language': 'en-US,en;q=0.9',
				'Connection': 'keep-alive',
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const vttText = await response.text();

		return new Response(vttText, {
			headers: {
				'Content-Type': 'text/vtt',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Cache-Control': 'no-cache'
			}
		});
	} catch (error) {
		console.error('Subtitle proxy error:', error);
		return new Response('Subtitle proxy error', { status: 500 });
	}
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
		}
	});
};
