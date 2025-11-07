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

		// Validate that we actually got an image (not HTML or text)
		// Check if content type is actually an image type
		if (!contentType.startsWith('image/')) {
			throw new Error(`Invalid content type: ${contentType}. Expected image type.`);
		}

		// Check blob size - if it's suspiciously small, it might be a placeholder
		if (imageBlob.size < 100) {
			throw new Error(`Image blob too small (${imageBlob.size} bytes), likely a placeholder or error page.`);
		}

		return new Response(imageBlob, {
			headers: {
				'Content-Type': contentType,
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Allow-Headers': '*',
				'Access-Control-Expose-Headers': '*',
				// Use shorter cache with revalidation to prevent stale cached images
				'Cache-Control': 'public, max-age=3600, must-revalidate', // 1 hour with revalidation
				'X-Content-Type-Options': 'nosniff',
				// Prevent Opera GX and other browsers from aggressively caching
				'Pragma': 'no-cache',
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
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Max-Age': '86400'
		}
	});
};

