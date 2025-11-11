import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Security Headers
	const securityHeaders: Record<string, string> = {
		// Prevent clickjacking attacks
		'X-Frame-Options': 'SAMEORIGIN',

		// Prevent MIME type sniffing
		'X-Content-Type-Options': 'nosniff',

		// Control referrer information
		'Referrer-Policy': 'strict-origin-when-cross-origin',

		// Restrict browser features and APIs
		'Permissions-Policy':
			'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',

		// Content Security Policy - configured for media streaming app
		'Content-Security-Policy': [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline/eval needed for SvelteKit dev mode and some dynamic imports
			"style-src 'self' 'unsafe-inline'", // unsafe-inline needed for component styles
			"img-src 'self' data: blob: https:", // Allow images from HTTPS sources
			"media-src 'self' data: blob: https:", // Allow media from HTTPS sources
			"font-src 'self' data:", // Allow fonts
			"connect-src 'self' https: wss:", // Allow API calls and WebSocket
			"frame-src 'self'",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'self'",
			"upgrade-insecure-requests"
		].join('; '),

		// Enable browser XSS protection (legacy but still useful)
		'X-XSS-Protection': '1; mode=block'
	};

	// Only add HSTS in production (requires HTTPS)
	if (process.env.NODE_ENV === 'production') {
		securityHeaders['Strict-Transport-Security'] =
			'max-age=31536000; includeSubDomains; preload';
	}

	// Apply all security headers
	Object.entries(securityHeaders).forEach(([header, value]) => {
		response.headers.set(header, value);
	});

	return response;
};

