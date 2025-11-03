import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const issueId = params.issueId;
	const comicId = params.id;
	
	if (!issueId) {
		throw error(400, 'Issue ID is required');
	}

	try {
		// Get comic info for navigation
		let comic = null;
		if (comicId) {
			try {
				const comicResponse = await fetch(`/api/search/comics/${comicId}`);
				if (comicResponse.ok) {
					comic = await comicResponse.json();
				}
			} catch {
				// Ignore errors for comic info, we can still load the issue
			}
		}

		// Get issue pages (need to pass comic slug as query parameter)
		const issueResponse = await fetch(`/api/comics/read/${issueId}?comic=${encodeURIComponent(comicId)}`);
		
		if (!issueResponse.ok) {
			throw error(issueResponse.status, 'Issue not found');
		}

		const issueData = await issueResponse.json();

		// Find current issue index for navigation
		let currentIssueIndex = -1;
		let nextIssue = null;
		let prevIssue = null;

		if (comic && comic.issues) {
			// Sort issues by issue number (ascending)
			const sortedIssues = [...comic.issues].sort((a: any, b: any) => {
				const numA = parseFloat(String(a.issueNumber || 0));
				const numB = parseFloat(String(b.issueNumber || 0));
				return numA - numB;
			});
			
			currentIssueIndex = sortedIssues.findIndex((issue: any) => issue.id === issueId);
			
			if (currentIssueIndex !== -1) {
				// Previous issue (lower issue number)
				if (currentIssueIndex > 0) {
					prevIssue = sortedIssues[currentIssueIndex - 1];
				}
				// Next issue (higher issue number)
				if (currentIssueIndex < sortedIssues.length - 1) {
					nextIssue = sortedIssues[currentIssueIndex + 1];
				}
			}
		}

		return {
			issue: issueData,
			comic,
			nextIssue,
			prevIssue,
			currentIssueIndex
		};
	} catch (err) {
		console.error('Error loading issue:', err);
		if (err instanceof Error && err.message.includes('404')) {
			throw error(404, 'Issue not found');
		}
		throw error(500, 'Failed to load issue');
	}
};

