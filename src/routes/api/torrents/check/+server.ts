import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
    const link = url.searchParams.get('link')?.trim();
    console.log("Received request to check redirects for: ", link);

    if (!link) {
        return new Response(JSON.stringify({ error: 'Link parameter is required' }), { status: 400 });
    }

    try {
        // Try to fetch without following redirects
        const response = await fetch(link, { redirect: 'manual' });

        if ([301, 302, 307, 308].includes(response.status)) {
            const redirectLocation = response.headers.get('location');
            console.log("Redirect found:", redirectLocation);
            return new Response(JSON.stringify({
                redirects: 1,
                finalUrl: redirectLocation
            }), { status: 200 });
        } else {
            return new Response(JSON.stringify({
                redirects: 0,
                finalUrl: null
            }), { status: 200 });
        }
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to check redirect' }), { status: 500 });
    }
};