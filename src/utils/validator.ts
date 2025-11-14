/**
 * Validates a Gemini API key format
 * @param apiKey - The API key to validate
 * @returns true if valid, false otherwise
 */
export function validateApiKey(apiKey: string): boolean {
	if (!apiKey || apiKey.trim().length === 0) {
		return false;
	}

	// Gemini API keys typically start with "AI" and are at least 20 characters
	// We use a more lenient validation to accommodate different key formats
	// that Google may issue for different services or over time
	// Format: AI[-A-Za-z0-9_]{18,} (starts with AI, followed by 18+ alphanumeric/dash/underscore chars)
	// Note: Hyphen is placed at the beginning of character class to avoid ambiguity
	const apiKeyPattern = /^AI[-A-Za-z0-9_]{18,}$/;

	return apiKeyPattern.test(apiKey);
}

/**
 * Validates that content is not empty
 * @param content - The content to validate
 * @returns true if content is not empty, false otherwise
 */
export function validateContent(content: string): boolean {
	if (!content) {
		return false;
	}
	return content.trim().length > 0;
}

/**
 * Checks if two arrays are equal (order-independent)
 * Uses Set-based approach for O(n) performance instead of O(n log n) sorting
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns true if arrays are equal, false otherwise
 */
export function arraysEqual(arr1: string[], arr2: string[]): boolean {
	if (arr1.length !== arr2.length) {
		return false;
	}

	// Count occurrences of each element in arr1
	const counts = new Map<string, number>();
	for (const item of arr1) {
		counts.set(item, (counts.get(item) || 0) + 1);
	}

	// Check if arr2 has the same elements with same counts
	for (const item of arr2) {
		const count = counts.get(item);
		if (!count) {
			return false; // Item not in arr1 or count exhausted
		}
		counts.set(item, count - 1);
	}

	return true;
}
