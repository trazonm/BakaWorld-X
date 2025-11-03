import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const chapterId = params.chapterId;
	const mangaId = params.id;
	
	if (!chapterId) {
		throw error(400, 'Chapter ID is required');
	}

	try {
		// Get manga info for navigation
		let manga = null;
		if (mangaId) {
			try {
				const mangaResponse = await fetch(`/api/search/manga/${mangaId}`);
				if (mangaResponse.ok) {
					manga = await mangaResponse.json();
				}
			} catch {
				// Ignore errors for manga info, we can still load the chapter
			}
		}

		// Get chapter pages
		const chapterResponse = await fetch(`/api/manga/read/${chapterId}`);
		
		if (!chapterResponse.ok) {
			throw error(chapterResponse.status, 'Chapter not found');
		}

		const chapterData = await chapterResponse.json();

		// Find current chapter index for navigation
		let currentChapterIndex = -1;
		let nextChapter = null;
		let prevChapter = null;

		if (manga && manga.chapters) {
			// Sort chapters by chapter number (ascending - oldest to newest)
			// Convert chapterNumber to number for proper sorting
			const sortedChapters = [...manga.chapters].sort((a: any, b: any) => {
				const numA = parseFloat(String(a.chapterNumber || a.number || 0));
				const numB = parseFloat(String(b.chapterNumber || b.number || 0));
				return numA - numB;
			});
			
			currentChapterIndex = sortedChapters.findIndex((ch: any) => ch.id === chapterId);
			
			if (currentChapterIndex !== -1) {
				// Previous chapter (lower chapter number - older)
				if (currentChapterIndex > 0) {
					prevChapter = sortedChapters[currentChapterIndex - 1];
				}
				// Next chapter (higher chapter number - newer)
				if (currentChapterIndex < sortedChapters.length - 1) {
					nextChapter = sortedChapters[currentChapterIndex + 1];
				}
			}
		}

		return {
			chapter: chapterData,
			manga: manga ? { id: manga.id, title: manga.title } : null,
			currentChapterIndex,
			nextChapter,
			prevChapter
		};
	} catch (err) {
		console.error('Error loading manga chapter:', err);
		if (err instanceof Error && err.message.includes('404')) {
			throw error(404, 'Chapter not found');
		}
		throw error(500, 'Failed to load chapter');
	}
};

