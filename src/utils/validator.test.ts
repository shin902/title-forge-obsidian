import { describe, it, expect } from 'vitest';
import { validateApiKey, validateContent, arraysEqual } from './validator';

describe('validateApiKey', () => {
	describe('valid API keys', () => {
		it('should accept valid API key with exactly 20 characters', () => {
			expect(validateApiKey('AI' + 'a'.repeat(18))).toBe(true);
		});

		it('should accept valid API key with more than 20 characters', () => {
			expect(validateApiKey('AI' + 'a'.repeat(30))).toBe(true);
		});

		it('should accept API key with uppercase letters', () => {
			expect(validateApiKey('AIABCDEFGHIJKLMNOPQR')).toBe(true);
		});

		it('should accept API key with lowercase letters', () => {
			expect(validateApiKey('AIabcdefghijklmnopqr')).toBe(true);
		});

		it('should accept API key with numbers', () => {
			expect(validateApiKey('AI123456789012345678')).toBe(true);
		});

		it('should accept API key with hyphens', () => {
			expect(validateApiKey('AIza-SyD_test12345678')).toBe(true);
		});

		it('should accept API key with underscores', () => {
			expect(validateApiKey('AIza_SyD_test12345678')).toBe(true);
		});

		it('should accept API key with mixed alphanumeric and special chars', () => {
			expect(validateApiKey('AIzaSyD-test_1234567890')).toBe(true);
		});
	});

	describe('invalid API keys', () => {
		it('should reject empty string', () => {
			expect(validateApiKey('')).toBe(false);
		});

		it('should reject whitespace only', () => {
			expect(validateApiKey('   ')).toBe(false);
		});

		it('should reject API key shorter than 20 characters', () => {
			expect(validateApiKey('AI' + 'a'.repeat(17))).toBe(false);
		});

		it('should reject API key not starting with AI', () => {
			expect(validateApiKey('XYza-SyD_test12345678')).toBe(false);
		});

		it('should reject API key starting with lowercase ai', () => {
			expect(validateApiKey('ai' + 'a'.repeat(18))).toBe(false);
		});

		it('should reject API key with invalid characters', () => {
			expect(validateApiKey('AI@#$%^&*()123456789')).toBe(false);
		});

		it('should reject API key with spaces', () => {
			expect(validateApiKey('AI abc def ghi jkl mno')).toBe(false);
		});

		it('should reject null (treated as empty)', () => {
			expect(validateApiKey(null as any)).toBe(false);
		});

		it('should reject undefined (treated as empty)', () => {
			expect(validateApiKey(undefined as any)).toBe(false);
		});
	});
});

describe('validateContent', () => {
	describe('valid content', () => {
		it('should accept non-empty string', () => {
			expect(validateContent('Hello, World!')).toBe(true);
		});

		it('should accept string with only spaces (after trim check)', () => {
			expect(validateContent('   content   ')).toBe(true);
		});

		it('should accept multiline content', () => {
			expect(validateContent('Line 1\nLine 2\nLine 3')).toBe(true);
		});

		it('should accept single character', () => {
			expect(validateContent('a')).toBe(true);
		});
	});

	describe('invalid content', () => {
		it('should reject empty string', () => {
			expect(validateContent('')).toBe(false);
		});

		it('should reject whitespace only', () => {
			expect(validateContent('   ')).toBe(false);
		});

		it('should reject tabs only', () => {
			expect(validateContent('\t\t\t')).toBe(false);
		});

		it('should reject newlines only', () => {
			expect(validateContent('\n\n\n')).toBe(false);
		});

		it('should reject null', () => {
			expect(validateContent(null as any)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(validateContent(undefined as any)).toBe(false);
		});
	});
});

describe('arraysEqual', () => {
	describe('equal arrays', () => {
		it('should return true for identical arrays', () => {
			expect(arraysEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
		});

		it('should return true for arrays with same elements in different order', () => {
			expect(arraysEqual(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(true);
		});

		it('should return true for empty arrays', () => {
			expect(arraysEqual([], [])).toBe(true);
		});

		it('should return true for single element arrays', () => {
			expect(arraysEqual(['a'], ['a'])).toBe(true);
		});

		it('should return true for arrays with duplicate elements', () => {
			expect(arraysEqual(['a', 'a', 'b'], ['b', 'a', 'a'])).toBe(true);
		});
	});

	describe('unequal arrays', () => {
		it('should return false for arrays with different lengths', () => {
			expect(arraysEqual(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
		});

		it('should return false for arrays with different elements', () => {
			expect(arraysEqual(['a', 'b', 'c'], ['a', 'b', 'd'])).toBe(false);
		});

		it('should return false for arrays with different element counts', () => {
			expect(arraysEqual(['a', 'a', 'b'], ['a', 'b', 'b'])).toBe(false);
		});

		it('should return false when comparing empty with non-empty', () => {
			expect(arraysEqual([], ['a'])).toBe(false);
		});
	});
});
