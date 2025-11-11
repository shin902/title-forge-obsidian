/**
 * Sanitizes a title by removing OS-incompatible characters
 * @param title - The title to sanitize
 * @returns Sanitized title
 */
export function sanitizeTitle(title: string): string {
	// Remove leading/trailing whitespace
	let sanitized = title.trim();

	// Replace OS-incompatible characters with space
	// /\:*?"<>|
	sanitized = sanitized.replace(/[\/\\:*?"<>|]/g, ' ');

	// Replace multiple spaces with single space
	sanitized = sanitized.replace(/\s+/g, ' ');

	return sanitized.trim();
}

/**
 * Normalizes tags according to the specification
 * @param tags - Comma-separated tags string or array of tags
 * @returns Array of normalized tags
 */
export function normalizeTags(tags: string | string[]): string[] {
	let tagArray: string[];

	if (typeof tags === 'string') {
		// Split by comma
		tagArray = tags.split(',');
	} else {
		tagArray = tags;
	}

	const normalized = tagArray
		.map(tag => {
			// Remove leading/trailing whitespace
			let normalized = tag.trim();

			// Remove # symbol
			normalized = normalized.replace(/^#/, '');

			// Convert to lowercase
			normalized = normalized.toLowerCase();

			// Replace spaces with hyphens
			normalized = normalized.replace(/\s+/g, '-');

			return normalized;
		})
		.filter(tag => tag.length > 0); // Remove empty tags

	// Remove duplicates
	return [...new Set(normalized)];
}

/**
 * Truncates content to a maximum length
 * @param content - The content to truncate
 * @param maxLength - Maximum length
 * @returns Truncated content
 */
export function truncateContent(content: string, maxLength: number): string {
	if (content.length <= maxLength) {
		return content;
	}

	return content.substring(0, maxLength);
}

/**
 * Removes frontmatter from content
 * @param content - The content with possible frontmatter
 * @returns Content without frontmatter
 */
export function removeFrontmatter(content: string): string {
	// Match YAML frontmatter (--- ... ---)
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
	return content.replace(frontmatterRegex, '').trim();
}
