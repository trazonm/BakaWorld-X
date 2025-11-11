// Endpoint to provide reCAPTCHA site key to the frontend
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	const siteKey = env.RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY || '';
	
	if (!siteKey) {
		return new Response(JSON.stringify({ error: 'RECAPTCHA_SITE_KEY not configured' }), { 
			status: 500 
		});
	}

	return new Response(JSON.stringify({ siteKey }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};

