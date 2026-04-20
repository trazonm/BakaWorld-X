/**
 * Strip internal catalog / stream host codenames from strings shown to end users.
 */
export function userFacingErrorMessage(message: string): string {
	if (!message) return message;
	return message
		.replace(/\bconsumet\s+api\b/gi, 'catalog service')
		.replace(/\bconsumet\b/gi, 'catalog')
		.replace(/\bflixhq\b/gi, 'stream')
		.replace(/\s+/g, ' ')
		.trim();
}
