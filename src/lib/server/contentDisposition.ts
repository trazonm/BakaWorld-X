/**
 * Build `Content-Disposition: attachment` for Fetch/Response headers.
 * Plain `filename="..."` must be a ByteString (≤ U+00FF); Unicode titles need RFC 5987 `filename*=UTF-8''...`.
 */
export function attachmentContentDisposition(filename: string): string {
	const name = filename.trim() || 'download';
	const asciiFallback =
		name
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^\x20-\x7E]/g, '_')
			.replace(/["\\]/g, '_')
			.replace(/[\x00-\x1f\x7f]/g, '_')
			.slice(0, 180) || 'download';
	const encoded = encodeURIComponent(name);
	return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
