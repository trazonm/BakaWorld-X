// Serve YouTube download file
import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

function sanitizeRequestedName(name: string | null, defaultName: string): string {
	if (!name) return defaultName;
	const sanitized = name.replace(INVALID_FILENAME_CHARS, '').trim();
	return sanitized || defaultName;
}

const TEMP_DIR = path.join(process.cwd(), 'temp', 'youtube');

export const GET: RequestHandler = async ({ params, url }) => {
	const fileId = params.id;
	
	if (!fileId) {
		return new Response(JSON.stringify({ error: 'File ID required' }), { status: 400 });
	}

	try {
		const extensions = ['.mp4', '.mp3', '.wav', '.flac'];
		let filePath: string | null = null;
		for (const ext of extensions) {
			const candidate = path.join(TEMP_DIR, `youtube-${fileId}${ext}`);
			if (fs.existsSync(candidate)) {
				filePath = candidate;
				break;
			}
		}

		if (!filePath) {
			// fallback: search directory
			const files = fs.readdirSync(TEMP_DIR);
			const match = files.find((f) => f.startsWith(`youtube-${fileId}`));
			if (match) {
				filePath = path.join(TEMP_DIR, match);
			}
		}

		if (!filePath || !fs.existsSync(filePath)) {
			return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 });
		}

		const stats = fs.statSync(filePath);
		
		// Ensure file is not empty
		if (stats.size < 1024) {
			return new Response(JSON.stringify({ error: 'File is incomplete' }), { status: 404 });
		}

		const fileStream = fs.createReadStream(filePath);
		
		// Clean up after 1 hour
		setTimeout(() => {
			try {
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			} catch (err) {
				console.error('Cleanup error:', err);
			}
		}, 60 * 60 * 1000);

		const requestedName = sanitizeRequestedName(url.searchParams.get('name'), path.basename(filePath));

		let contentType = 'application/octet-stream';
		if (filePath.endsWith('.mp4')) contentType = 'video/mp4';
		else if (filePath.endsWith('.mp3')) contentType = 'audio/mpeg';
		else if (filePath.endsWith('.wav')) contentType = 'audio/wav';
		else if (filePath.endsWith('.flac')) contentType = 'audio/flac';

		return new Response(fileStream as any, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Length': stats.size.toString(),
				'Content-Disposition': `attachment; filename="${requestedName}"`,
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('Error serving file:', error);
		return new Response(JSON.stringify({ error: 'Failed to serve file' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
