// Torrent search via Jackett, with optional Usenet results from Prowlarr.
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSessionUser } from '$lib/server/session';
import { searchJackett, searchProwlarrUsenet, type ReleaseHit } from '$lib/server/releaseSearch';

export const GET: RequestHandler = async ({ request }) => {
	const user = getSessionUser(request);
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}
	const query = new URL(request.url).searchParams.get('query')?.trim();
	if (!query) {
		return new Response(JSON.stringify({ error: 'Query parameter is required' }), { status: 400 });
	}

	const jackettUrl = (env.JACKETT_URL || process.env.JACKETT_URL || 'https://jackett-service.gleeze.com').replace(
		/\/$/,
		''
	);
	const jackettApiKey = env.JACKETT_API_KEY || process.env.JACKETT_API_KEY || '';
	const prowlarrUrl = (env.PROWLARR_URL || process.env.PROWLARR_URL || '').replace(/\/$/, '');
	const prowlarrApiKey = env.PROWLARR_API_KEY || process.env.PROWLARR_API_KEY || '';

	const warnings: string[] = [];
	const jobs: Promise<ReleaseHit[]>[] = [];

	if (!jackettApiKey) {
		warnings.push('Jackett is not configured (set JACKETT_URL and JACKETT_API_KEY).');
	} else {
		jobs.push(
			searchJackett(query, jackettUrl, jackettApiKey).catch((error: unknown) => {
				const message = error instanceof Error ? error.message : 'Jackett search failed';
				warnings.push(`Jackett: ${message}`);
				return [];
			})
		);
	}

	if (prowlarrUrl && prowlarrApiKey) {
		jobs.push(
			searchProwlarrUsenet(query, prowlarrUrl, prowlarrApiKey).catch((error: unknown) => {
				const message = error instanceof Error ? error.message : 'Prowlarr search failed';
				warnings.push(`Prowlarr: ${message}`);
				return [];
			})
		);
	}

	const groups = await Promise.all(jobs);
	const results = groups.flat().sort((a, b) => b.Seeders - a.Seeders || b.Size - a.Size);

	if (results.length === 0 && warnings.length > 0 && !jackettApiKey && !(prowlarrUrl && prowlarrApiKey)) {
		return new Response(JSON.stringify({ error: warnings[0], Results: [], warnings }), { status: 500 });
	}

	return new Response(JSON.stringify({ Results: results, warnings }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
