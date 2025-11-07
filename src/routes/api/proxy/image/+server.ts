import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, request }) => {
	const imageUrl = url.searchParams.get('url');
	const referer = url.searchParams.get('referer') || 'https://readcomicsonline.ru/';

	if (!imageUrl) {
		return new Response('Missing image URL', { status: 400 });
	}

	// Extract origin from referer URL
	let origin = 'https://readcomicsonline.ru';
	try {
		const refererUrl = new URL(referer);
		origin = refererUrl.origin;
	} catch (e) {
		// If referer parsing fails, use default
		console.warn('Failed to parse referer URL, using default origin:', referer);
	}

	try {
		const response = await fetch(imageUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Referer': referer,
				'Origin': origin,
				'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'Connection': 'keep-alive',
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// Get the image as a blob
		const imageBlob = await response.blob();

		// Determine content type from response or infer from URL
		let contentType = response.headers.get('content-type');
		if (!contentType) {
			if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
				contentType = 'image/jpeg';
			} else if (imageUrl.includes('.png')) {
				contentType = 'image/png';
			} else if (imageUrl.includes('.webp')) {
				contentType = 'image/webp';
			} else {
				contentType = 'image/jpeg'; // Default
			}
		}

		return new Response(imageBlob, {
			headers: {
				'Content-Type': contentType,
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
			}
		});
	} catch (error) {
		console.error('Image proxy error:', error);
		return new Response(`Image proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
			status: 500,
			headers: {
				'Access-Control-Allow-Origin': '*'
			}
		});
	}
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
			'Access-Control-Max-Age': '86400'
		}
	});
};

