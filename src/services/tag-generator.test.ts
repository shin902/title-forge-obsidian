import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagGenerator } from './tag-generator';
import { GeminiClient } from './gemini-client';
import { normalizeTags, removeFrontmatter, truncateContent } from '../utils/text-sanitizer';
import { TitleForgeSettings, DEFAULT_SETTINGS, GEMINI_MODEL } from '../settings';

// Mock dependencies
const { mockGeminiClientInstance } = vi.hoisted(() => ({
	mockGeminiClientInstance: {
		generateContent: vi.fn()
	}
}));

vi.mock('./gemini-client', () => ({
	GeminiClient: function() {
		return mockGeminiClientInstance;
	}
}));
vi.mock('../utils/text-sanitizer');

describe('TagGenerator', () => {
	let generator: TagGenerator;
	let mockGeminiClient: any;
	let settings: TitleForgeSettings;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Reset the mock generateContent function
		mockGeminiClientInstance.generateContent = vi.fn();

		// Mock text-sanitizer functions with default implementations
		vi.mocked(removeFrontmatter).mockImplementation((content: string) => content);
		vi.mocked(truncateContent).mockImplementation((content: string) => content);
		vi.mocked(normalizeTags).mockImplementation((tags: string) => tags.split(',').map(t => t.trim()));

		// Create instance
		generator = new TagGenerator();
		mockGeminiClient = mockGeminiClientInstance;

		// Setup default settings
		settings = {
			...DEFAULT_SETTINGS,
			apiKey: 'AIzaSyD-test_1234567890',
			tagTemperature: 0.2,
			tagMaxOutputTokens: 128,
			maxContentLength: 100
		};
	});

	describe('generateTags', () => {
		it('should generate tags successfully', async () => {
			const content = 'これはテストの内容です。';
			const generatedTags = 'タグ1, タグ2, タグ3';
			const normalizedTags = ['タグ1', 'タグ2', 'タグ3'];

			mockGeminiClient.generateContent.mockResolvedValue(generatedTags);
			vi.mocked(normalizeTags).mockReturnValue(normalizedTags);

			const result = await generator.generateTags(content, settings);

			expect(result).toEqual(normalizedTags);
			expect(mockGeminiClient.generateContent).toHaveBeenCalledTimes(1);
		});

		it('should remove frontmatter before processing', async () => {
			const contentWithFrontmatter = `---
title: Test
tags: []
---
Content here`;
			const contentWithoutFrontmatter = 'Content here';

			vi.mocked(removeFrontmatter).mockReturnValue(contentWithoutFrontmatter);
			mockGeminiClient.generateContent.mockResolvedValue('tag1, tag2');
			vi.mocked(normalizeTags).mockReturnValue(['tag1', 'tag2']);

			await generator.generateTags(contentWithFrontmatter, settings);

			expect(removeFrontmatter).toHaveBeenCalledWith(contentWithFrontmatter);
			expect(truncateContent).toHaveBeenCalledWith(contentWithoutFrontmatter, settings.maxContentLength);
		});

		it('should truncate content to maxContentLength', async () => {
			const content = 'Long content here';
			const truncated = 'Long conte';

			vi.mocked(removeFrontmatter).mockReturnValue(content);
			vi.mocked(truncateContent).mockReturnValue(truncated);
			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			expect(truncateContent).toHaveBeenCalledWith(content, settings.maxContentLength);
		});

		it('should call normalizeTags on generated tags', async () => {
			const content = 'Test content';
			const rawTags = 'Tag1, Tag2, Tag3';
			const normalizedTags = ['tag1', 'tag2', 'tag3'];

			mockGeminiClient.generateContent.mockResolvedValue(rawTags);
			vi.mocked(normalizeTags).mockReturnValue(normalizedTags);

			const result = await generator.generateTags(content, settings);

			expect(normalizeTags).toHaveBeenCalledWith(rawTags);
			expect(result).toEqual(normalizedTags);
		});

		it('should pass correct config to GeminiClient', async () => {
			const content = 'Test content';

			mockGeminiClient.generateContent.mockResolvedValue('tag1, tag2');
			vi.mocked(normalizeTags).mockReturnValue(['tag1', 'tag2']);

			await generator.generateTags(content, settings);

			expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
				expect.any(String),
				{
					apiKey: settings.apiKey,
					model: GEMINI_MODEL,
					temperature: settings.tagTemperature,
					topK: 1,
					topP: 1,
					maxOutputTokens: settings.tagMaxOutputTokens
				}
			);
		});

		it('should build prompt with truncated content', async () => {
			const content = 'Test content';
			const truncated = 'Test con';

			vi.mocked(truncateContent).mockReturnValue(truncated);
			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const prompt = callArgs[0];

			expect(prompt).toContain(truncated);
			expect(prompt).toContain('キーワードを抽出し');
			expect(prompt).toContain('カンマ区切り');
		});

		it('should use configured temperature value', async () => {
			const content = 'Test content';
			settings.tagTemperature = 0.5;

			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.temperature).toBe(0.5);
		});

		it('should use configured maxOutputTokens value', async () => {
			const content = 'Test content';
			settings.tagMaxOutputTokens = 256;

			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.maxOutputTokens).toBe(256);
		});

		it('should propagate errors from GeminiClient', async () => {
			const content = 'Test content';
			const error = new Error('API Error');

			mockGeminiClient.generateContent.mockRejectedValue(error);

			await expect(generator.generateTags(content, settings))
				.rejects.toThrow('API Error');
		});

		it('should handle empty content', async () => {
			const content = '';

			vi.mocked(removeFrontmatter).mockReturnValue('');
			vi.mocked(truncateContent).mockReturnValue('');
			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			expect(mockGeminiClient.generateContent).toHaveBeenCalled();
		});

		it('should handle content with only frontmatter', async () => {
			const contentWithOnlyFrontmatter = `---
title: Test
---`;
			const emptyContent = '';

			vi.mocked(removeFrontmatter).mockReturnValue(emptyContent);
			vi.mocked(truncateContent).mockReturnValue(emptyContent);
			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(contentWithOnlyFrontmatter, settings);

			expect(removeFrontmatter).toHaveBeenCalledWith(contentWithOnlyFrontmatter);
		});

		it('should process content pipeline in correct order', async () => {
			const originalContent = '---\ntitle: Test\n---\nContent here with more text';
			const afterRemoveFrontmatter = 'Content here with more text';
			const afterTruncate = 'Content here';

			const calls: string[] = [];

			vi.mocked(removeFrontmatter).mockImplementation((content) => {
				calls.push('removeFrontmatter');
				return afterRemoveFrontmatter;
			});

			vi.mocked(truncateContent).mockImplementation((content) => {
				calls.push('truncateContent');
				expect(content).toBe(afterRemoveFrontmatter);
				return afterTruncate;
			});

			mockGeminiClient.generateContent.mockImplementation((prompt) => {
				calls.push('generateContent');
				expect(prompt).toContain(afterTruncate);
				return Promise.resolve('tag');
			});

			vi.mocked(normalizeTags).mockImplementation((tags) => {
				calls.push('normalizeTags');
				return ['tag'];
			});

			await generator.generateTags(originalContent, settings);

			expect(calls).toEqual([
				'removeFrontmatter',
				'truncateContent',
				'generateContent',
				'normalizeTags'
			]);
		});

		it('should use GEMINI_MODEL constant', async () => {
			const content = 'Test content';

			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.model).toBe(GEMINI_MODEL);
			expect(config.model).toBe('gemini-2.5-flash-lite');
		});

		it('should set topK and topP to 1', async () => {
			const content = 'Test content';

			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.topK).toBe(1);
			expect(config.topP).toBe(1);
		});

		it('should include all required prompt elements', async () => {
			const content = 'Test content';

			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const prompt = callArgs[0];

			expect(prompt).toContain('キーワードを抽出し');
			expect(prompt).toContain('タグを日本語で生成');
			expect(prompt).toContain('カンマ区切りのリスト');
			expect(prompt).toContain('ハイフンで繋いで');
			expect(prompt).toContain('Content:');
		});

		it('should handle single tag result', async () => {
			const content = 'Test content';
			const singleTag = 'test-tag';

			mockGeminiClient.generateContent.mockResolvedValue(singleTag);
			vi.mocked(normalizeTags).mockReturnValue([singleTag]);

			const result = await generator.generateTags(content, settings);

			expect(result).toEqual([singleTag]);
		});

		it('should handle multiple tags result', async () => {
			const content = 'Test content';
			const multipleTags = 'tag1, tag2, tag3, tag4, tag5';
			const normalizedTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];

			mockGeminiClient.generateContent.mockResolvedValue(multipleTags);
			vi.mocked(normalizeTags).mockReturnValue(normalizedTags);

			const result = await generator.generateTags(content, settings);

			expect(result).toEqual(normalizedTags);
			expect(result.length).toBe(5);
		});

		it('should respect maxContentLength setting', async () => {
			const content = 'Test content';
			settings.maxContentLength = 50;

			mockGeminiClient.generateContent.mockResolvedValue('tag');
			vi.mocked(normalizeTags).mockReturnValue(['tag']);

			await generator.generateTags(content, settings);

			expect(truncateContent).toHaveBeenCalledWith(expect.any(String), 50);
		});
	});
});
