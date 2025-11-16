// Serve Spotify download file
import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp', 'spotify');

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { id } = params;
		const requestedName = url.searchParams.get('name') || 'spotify_track.flac';

		if (!id) {
			return new Response('File ID required', { status: 400 });
		}

		// Find file with matching ID
		const files = fs.readdirSync(TEMP_DIR);
		const extensions = ['.flac', '.mp3', '.m4a', '.wav'];
		
		let filePath: string | null = null;
		for (const ext of extensions) {
			const candidate = path.join(TEMP_DIR, `spotify-${id}${ext}`);
			if (fs.existsSync(candidate)) {
				filePath = candidate;
				break;
			}
		}

		if (!filePath) {
			const match = files.find((f) => f.startsWith(`spotify-${id}`));
			if (match) {
				filePath = path.join(TEMP_DIR, match);
			}
		}

		if (!filePath || !fs.existsSync(filePath)) {
			return new Response('File not found', { status: 404 });
		}

		const fileBuffer = fs.readFileSync(filePath);
		const stats = fs.statSync(filePath);

		// Clean up after 1 hour (same as YouTube files)
		setTimeout(() => {
			try {
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			} catch (err) {
				console.error('Cleanup error:', err);
			}
		}, 60 * 60 * 1000);

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/flac',
				'Content-Length': stats.size.toString(),
				'Content-Disposition': `attachment; filename="${requestedName}"`,
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('Error serving Spotify file:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

