import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const chapterId = params.chapterId;
	// params.id is now an array like ["3069", "naruto"] because we use [...id]
	const mangaIdSegments = params.id;
	
	if (!chapterId) {
		throw error(400, 'Chapter ID is required');
	}

	try {
		// Get manga info for navigation
		let manga = null;
		if (mangaIdSegments) {
			try {
				// Join the segments back together: ["3069", "naruto"] -> "3069/naruto"
				const mangaId = mangaIdSegments;
				// Prepend "manga/" for the API call
				const fullMangaId = `manga/${mangaId}`;
				const mangaResponse = await fetch(`/api/search/manga/${encodeURIComponent(fullMangaId)}`);
				if (mangaResponse.ok) {
					manga = await mangaResponse.json();
				}
			} catch {
				// Ignore errors for manga info, we can still load the chapter
			}
		}

		// Get chapter pages
		// The params.chapterId will be something like "1063-10001000/dragon-ball-chapter-1"
		// We need to prepend "chapters/" for the API call
		const fullChapterId = `chapters/${chapterId}`;
		const chapterResponse = await fetch(`/api/manga/read/${encodeURIComponent(fullChapterId)}`);
		
		if (!chapterResponse.ok) {
			throw error(chapterResponse.status, 'Chapter not found');
		}

		const chapterData = await chapterResponse.json();

		// Find current chapter index for navigation
		let currentChapterIndex = -1;
		let nextChapter = null;
		let prevChapter = null;

		if (manga && manga.chapters) {
			// Sort chapters by chapter number extracted from title (ascending - oldest to newest)
			// Mangapill API only provides "title" field like "Chapter 1", "Chapter 2.5"
			const sortedChapters = [...manga.chapters].sort((a: any, b: any) => {
				// Extract chapter number from title (e.g., "Chapter 123" -> 123)
				const extractChapterNum = (title: string) => {
					const match = title.match(/chapter\s+(\d+(?:\.\d+)?)/i);
					return match ? parseFloat(match[1]) : 0;
				};
				
				const numA = extractChapterNum(a.title || '');
				const numB = extractChapterNum(b.title || '');
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

