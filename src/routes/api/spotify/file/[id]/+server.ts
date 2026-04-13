// Serve Spotify download file
import type { RequestHandler } from '@sveltejs/kit';
import { attachmentContentDisposition } from '$lib/server/contentDisposition';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp', 'spotify');

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { id } = params;
		const requestedName = url.searchParams.get('name') || 'spotify_track.mp3';

		if (!id) {
			return new Response('File ID required', { status: 400 });
		}

		// Find file with matching ID
		const files = fs.readdirSync(TEMP_DIR);
		const extensions = ['.flac', '.mp3', '.m4a', '.wav', '.ogg'];
		
		let filePath: string | null = null;
		for (const ext of extensions) {
			const candidate = path.join(TEMP_DIR, `spotify-${id}${ext}`);
			if (fs.existsSync(candidate)) {
				filePath = candidate;
				break;
			}
		}

		if (!filePath) {
			const expectedStem = `spotify-${id}`;
			const match = files.find((f) => path.parse(f).name === expectedStem);
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

		const contentType = filePath.endsWith('.mp3')
			? 'audio/mpeg'
			: filePath.endsWith('.ogg')
				? 'audio/ogg'
				: filePath.endsWith('.m4a')
					? 'audio/mp4'
					: filePath.endsWith('.wav')
						? 'audio/wav'
						: 'audio/flac';

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': stats.size.toString(),
				'Content-Disposition': attachmentContentDisposition(requestedName),
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (error) {
		console.error('Error serving Spotify file:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

