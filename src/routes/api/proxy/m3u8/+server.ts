import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, request }) => {
    const playlistUrl = url.searchParams.get('url');
    const referer = url.searchParams.get('referer') || 'https://hianime.to/';
    
    if (!playlistUrl) {
        return new Response('Missing playlist URL', { status: 400 });
    }
    
    // console.log('Proxying M3U8 request to:', playlistUrl);
    
    try {
        const response = await fetch(playlistUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Origin': 'https://hianime.to',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let content = await response.text();
        
        // Rewrite relative URLs in the playlist to go through our proxy
        const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);
        
        content = content.replace(/^([^#\n].*\.ts.*)$/gm, (match, segment) => {
            if (segment.startsWith('http')) {
                // Already absolute URL, proxy it
                return `/api/proxy/video?url=${encodeURIComponent(segment)}&referer=${encodeURIComponent(referer)}`;
            } else {
                // Relative URL, make absolute then proxy
                const absoluteUrl = baseUrl + segment;
                return `/api/proxy/video?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
            }
        });
        
        // Also handle sub-playlists (quality variants)
        content = content.replace(/^([^#\n].*\.m3u8.*)$/gm, (match, playlist) => {
            if (playlist.startsWith('http')) {
                return `/api/proxy/m3u8?url=${encodeURIComponent(playlist)}&referer=${encodeURIComponent(referer)}`;
            } else {
                const absoluteUrl = baseUrl + playlist;
                return `/api/proxy/m3u8?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
            }
        });
        
        return new Response(content, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Cache-Control': 'no-cache'
            }
        });
        
    } catch (error) {
        console.error('M3U8 proxy error:', error);
        return new Response('Proxy error', { status: 500 });
    }
};

export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        }
    });
};
