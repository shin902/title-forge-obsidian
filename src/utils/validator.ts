/**
 * Validates a Gemini API key format
 * @param apiKey - The API key to validate
 * @returns true if valid, false otherwise
 */
export function validateApiKey(apiKey: string): boolean {
	if (!apiKey || apiKey.trim().length === 0) {
		return false;
	}

	// Gemini API keys should be at least 20 characters and start with "AI"
	if (apiKey.length < 20 || !apiKey.startsWith('AI')) {
		return false;
	}

	return true;
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
 * Checks if two arrays are equal
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns true if arrays are equal, false otherwise
 */
export function arraysEqual(arr1: string[], arr2: string[]): boolean {
	if (arr1.length !== arr2.length) {
		return false;
	}

	const sorted1 = [...arr1].sort();
	const sorted2 = [...arr2].sort();

	return sorted1.every((val, index) => val === sorted2[index]);
}
