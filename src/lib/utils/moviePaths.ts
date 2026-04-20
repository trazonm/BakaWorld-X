/** Build `/movies/...` path for media ids that may contain `/` (e.g. `tv/watch-show-123`). */
export function movieDetailPath(mediaId: string): string {
	return '/movies/' + mediaId.split('/').map(encodeURIComponent).join('/');
}

export function movieWatchPath(mediaId: string, episodeId: string): string {
	return `${movieDetailPath(mediaId)}/watch/${encodeURIComponent(episodeId)}`;
}
