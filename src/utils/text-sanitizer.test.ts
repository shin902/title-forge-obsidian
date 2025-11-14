import { describe, it, expect } from 'vitest';
import { sanitizeTitle, normalizeTags, truncateContent, removeFrontmatter } from './text-sanitizer';

describe('sanitizeTitle', () => {
	describe('basic sanitization', () => {
		it('should trim leading and trailing whitespace', () => {
			expect(sanitizeTitle('  Hello World  ')).toBe('Hello World');
		});

		it('should return unchanged for valid title', () => {
			expect(sanitizeTitle('Valid Title')).toBe('Valid Title');
		});

		it('should handle empty string', () => {
			expect(sanitizeTitle('')).toBe('');
		});
	});

	describe('OS-incompatible character removal', () => {
		it('should replace forward slash with space', () => {
			expect(sanitizeTitle('Hello/World')).toBe('Hello World');
		});

		it('should replace backslash with space', () => {
			expect(sanitizeTitle('Hello\\World')).toBe('Hello World');
		});

		it('should replace colon with space', () => {
			expect(sanitizeTitle('Hello:World')).toBe('Hello World');
		});

		it('should replace asterisk with space', () => {
			expect(sanitizeTitle('Hello*World')).toBe('Hello World');
		});

		it('should replace question mark with space', () => {
			expect(sanitizeTitle('Hello?World')).toBe('Hello World');
		});

		it('should replace double quote with space', () => {
			expect(sanitizeTitle('Hello"World')).toBe('Hello World');
		});

		it('should replace less than with space', () => {
			expect(sanitizeTitle('Hello<World')).toBe('Hello World');
		});

		it('should replace greater than with space', () => {
			expect(sanitizeTitle('Hello>World')).toBe('Hello World');
		});

		it('should replace pipe with space', () => {
			expect(sanitizeTitle('Hello|World')).toBe('Hello World');
		});

		it('should replace multiple incompatible characters', () => {
			expect(sanitizeTitle('Hello/World:Test*File')).toBe('Hello World Test File');
		});
	});

	describe('multiple spaces handling', () => {
		it('should replace multiple spaces with single space', () => {
			expect(sanitizeTitle('Hello    World')).toBe('Hello World');
		});

		it('should handle tabs and spaces', () => {
			expect(sanitizeTitle('Hello\t\t  World')).toBe('Hello World');
		});

		it('should handle newlines', () => {
			expect(sanitizeTitle('Hello\n\nWorld')).toBe('Hello World');
		});
	});
});

describe('normalizeTags', () => {
	describe('string input', () => {
		it('should split comma-separated tags', () => {
			expect(normalizeTags('tag1, tag2, tag3')).toEqual(['tag1', 'tag2', 'tag3']);
		});

		it('should remove leading/trailing whitespace', () => {
			expect(normalizeTags('  tag1  ,  tag2  ')).toEqual(['tag1', 'tag2']);
		});

		it('should convert to lowercase', () => {
			expect(normalizeTags('TAG1, Tag2, TaG3')).toEqual(['tag1', 'tag2', 'tag3']);
		});

		it('should remove # symbol', () => {
			expect(normalizeTags('#tag1, #tag2')).toEqual(['tag1', 'tag2']);
		});

		it('should replace spaces with hyphens', () => {
			expect(normalizeTags('hello world, foo bar')).toEqual(['hello-world', 'foo-bar']);
		});

		it('should remove duplicate tags', () => {
			expect(normalizeTags('tag1, tag2, tag1')).toEqual(['tag1', 'tag2']);
		});

		it('should filter out empty tags', () => {
			expect(normalizeTags('tag1, , tag2,  ')).toEqual(['tag1', 'tag2']);
		});

		it('should handle single tag', () => {
			expect(normalizeTags('tag1')).toEqual(['tag1']);
		});

		it('should handle empty string', () => {
			expect(normalizeTags('')).toEqual([]);
		});
	});

	describe('array input', () => {
		it('should normalize array of tags', () => {
			expect(normalizeTags(['TAG1', 'Tag2'])).toEqual(['tag1', 'tag2']);
		});

		it('should remove # symbol from array', () => {
			expect(normalizeTags(['#tag1', '#tag2'])).toEqual(['tag1', 'tag2']);
		});

		it('should replace spaces in array tags', () => {
			expect(normalizeTags(['hello world', 'foo bar'])).toEqual(['hello-world', 'foo-bar']);
		});

		it('should remove duplicates from array', () => {
			expect(normalizeTags(['tag1', 'TAG1', 'tag1'])).toEqual(['tag1']);
		});

		it('should filter empty strings from array', () => {
			expect(normalizeTags(['tag1', '', 'tag2'])).toEqual(['tag1', 'tag2']);
		});

		it('should handle empty array', () => {
			expect(normalizeTags([])).toEqual([]);
		});
	});

	describe('edge cases', () => {
		it('should handle multiple spaces in tags', () => {
			expect(normalizeTags('hello   world')).toEqual(['hello-world']);
		});

		it('should handle tags with only # symbol', () => {
			expect(normalizeTags('#')).toEqual([]);
		});

		it('should handle mixed case and special chars', () => {
			expect(normalizeTags('#Hello World, #FOO-BAR')).toEqual(['hello-world', 'foo-bar']);
		});

		it('should handle Japanese characters', () => {
			expect(normalizeTags('テスト, プログラミング')).toEqual(['テスト', 'プログラミング']);
		});
	});
});

describe('truncateContent', () => {
	describe('basic truncation', () => {
		it('should not truncate when content is shorter than max length', () => {
			expect(truncateContent('Hello', 10)).toBe('Hello');
		});

		it('should not truncate when content equals max length', () => {
			expect(truncateContent('Hello', 5)).toBe('Hello');
		});

		it('should truncate when content is longer than max length', () => {
			expect(truncateContent('Hello World', 5)).toBe('Hello');
		});

		it('should handle empty string', () => {
			expect(truncateContent('', 10)).toBe('');
		});

		it('should handle max length of 0', () => {
			expect(truncateContent('Hello', 0)).toBe('');
		});
	});

	describe('multiline content', () => {
		it('should truncate multiline content', () => {
			const content = 'Line 1\nLine 2\nLine 3';
			expect(truncateContent(content, 10)).toBe('Line 1\nLin');
		});
	});

	describe('edge cases', () => {
		it('should handle very large max length', () => {
			const content = 'Hello';
			expect(truncateContent(content, 1000000)).toBe('Hello');
		});

		it('should handle negative max length (treated as 0)', () => {
			expect(truncateContent('Hello', -5)).toBe('');
		});
	});
});

describe('removeFrontmatter', () => {
	describe('with frontmatter', () => {
		it('should remove YAML frontmatter', () => {
			const content = '---\ntitle: Test\ntags: [a, b]\n---\nContent here';
			expect(removeFrontmatter(content)).toBe('Content here');
		});

		it('should handle empty frontmatter', () => {
			// Note: regex requires at least one newline between --- markers
			const content = '---\n\n---\nContent here';
			expect(removeFrontmatter(content)).toBe('Content here');
		});

		it('should handle frontmatter with multiple lines', () => {
			const content = '---\ntitle: Test\nauthor: John\ndate: 2023-01-01\n---\nContent here';
			expect(removeFrontmatter(content)).toBe('Content here');
		});

		it('should trim result after removing frontmatter', () => {
			const content = '---\ntitle: Test\n---\n\n\nContent here';
			expect(removeFrontmatter(content)).toBe('Content here');
		});
	});

	describe('without frontmatter', () => {
		it('should return content unchanged when no frontmatter', () => {
			const content = 'Just regular content';
			expect(removeFrontmatter(content)).toBe('Just regular content');
		});

		it('should not remove dashes that are not frontmatter', () => {
			const content = 'Some content\n---\nMore content';
			expect(removeFrontmatter(content)).toBe('Some content\n---\nMore content');
		});

		it('should handle empty string', () => {
			expect(removeFrontmatter('')).toBe('');
		});
	});

	describe('edge cases', () => {
		it('should handle content with only frontmatter', () => {
			// Regex requires newline after closing ---, so this won't match
			const content = '---\ntitle: Test\n---\n';
			expect(removeFrontmatter(content)).toBe('');
		});

		it('should handle incomplete frontmatter (missing closing)', () => {
			const content = '---\ntitle: Test\nContent here';
			expect(removeFrontmatter(content)).toBe('---\ntitle: Test\nContent here');
		});

		it('should handle frontmatter with Windows line endings', () => {
			const content = '---\r\ntitle: Test\r\n---\r\nContent here';
			// Note: The regex actually works with \r\n because \n is still present
			// The \r is treated as part of the content but trimmed at the end
			expect(removeFrontmatter(content)).toBe('Content here');
		});
	});
});
