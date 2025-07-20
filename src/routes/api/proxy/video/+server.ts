import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, request }) => {
    const videoUrl = url.searchParams.get('url');
    const referer = url.searchParams.get('referer') || 'https://megacloud.blog/';
    
    if (!videoUrl) {
        return new Response('Missing video URL', { status: 400 });
    }
    
    // console.log('Proxying video request to:', videoUrl);
    
    try {
        const requestHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': referer,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity', // Disable compression for streaming
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
        };
        
        // Forward range header for video seeking support
        const range = request.headers.get('range');
        if (range) {
            requestHeaders['Range'] = range;
        }
        
        const response = await fetch(videoUrl, {
            headers: requestHeaders,
            method: 'GET'
        });
        
        // console.log('Response status:', response.status);
        // console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            console.error('Fetch failed:', response.status, response.statusText);
            return new Response(`Fetch failed: ${response.status} ${response.statusText}`, { 
                status: response.status 
            });
        }
        
        // Create response headers
        const responseHeaders = new Headers();
        
        // Copy important headers from the original response
        const headersToForward = [
            'content-type',
            'content-length',
            'content-range',
            'accept-ranges',
            'cache-control',
            'etag',
            'last-modified',
            'expires'
        ];
        
        headersToForward.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                responseHeaders.set(header, value);
            }
        });
        
        // Add CORS headers to allow cross-origin access
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Range, Authorization');
        responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
        responseHeaders.set('Access-Control-Max-Age', '86400');
        
        // For M3U8 files, ensure correct content type
        if (videoUrl.includes('.m3u8')) {
            responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
        }
        
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
        
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(`Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};

export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Range, Authorization',
            'Access-Control-Max-Age': '86400'
        }
    });
};
