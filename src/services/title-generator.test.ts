import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TitleGenerator } from './title-generator';
import { GeminiClient } from './gemini-client';
import { sanitizeTitle } from '../utils/text-sanitizer';
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

describe('TitleGenerator', () => {
	let generator: TitleGenerator;
	let mockGeminiClient: any;
	let settings: TitleForgeSettings;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Reset the mock generateContent function
		mockGeminiClientInstance.generateContent = vi.fn();

		// Mock sanitizeTitle to return input as-is by default
		vi.mocked(sanitizeTitle).mockImplementation((title: string) => title);

		// Create instance
		generator = new TitleGenerator();
		mockGeminiClient = mockGeminiClientInstance;

		// Setup default settings
		settings = {
			...DEFAULT_SETTINGS,
			apiKey: 'AIzaSyD-test_1234567890',
			maxTitleLength: 40,
			titleTemperature: 0.2,
			titleMaxOutputTokens: 64
		};
	});

	describe('generateTitle', () => {
		it('should generate title successfully', async () => {
			const content = 'これはテストの内容です。';
			const generatedTitle = 'テストタイトル';

			mockGeminiClient.generateContent.mockResolvedValue(generatedTitle);

			const result = await generator.generateTitle(content, settings);

			expect(result).toBe(generatedTitle);
			expect(mockGeminiClient.generateContent).toHaveBeenCalledTimes(1);
		});

		it('should call sanitizeTitle on generated title', async () => {
			const content = 'Test content';
			const rawTitle = 'Title/with:invalid*chars';
			const sanitizedTitle = 'Title-with-invalid-chars';

			mockGeminiClient.generateContent.mockResolvedValue(rawTitle);
			vi.mocked(sanitizeTitle).mockReturnValue(sanitizedTitle);

			const result = await generator.generateTitle(content, settings);

			expect(sanitizeTitle).toHaveBeenCalledWith(rawTitle);
			expect(result).toBe(sanitizedTitle);
		});

		it('should trim title if it exceeds maxTitleLength', async () => {
			const content = 'Test content';
			const longTitle = 'これは非常に長いタイトルで、最大文字数を超えています。とても長いです。';

			mockGeminiClient.generateContent.mockResolvedValue(longTitle);
			vi.mocked(sanitizeTitle).mockReturnValue(longTitle);

			settings.maxTitleLength = 20;

			const result = await generator.generateTitle(content, settings);

			expect(result.length).toBeLessThanOrEqual(20);
			expect(result).toBe(longTitle.substring(0, 20).trim());
		});

		it('should not trim title if within maxTitleLength', async () => {
			const content = 'Test content';
			const shortTitle = '短いタイトル';

			mockGeminiClient.generateContent.mockResolvedValue(shortTitle);
			vi.mocked(sanitizeTitle).mockReturnValue(shortTitle);

			settings.maxTitleLength = 40;

			const result = await generator.generateTitle(content, settings);

			expect(result).toBe(shortTitle);
		});

		it('should pass correct config to GeminiClient', async () => {
			const content = 'Test content';

			mockGeminiClient.generateContent.mockResolvedValue('Title');

			await generator.generateTitle(content, settings);

			expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
				expect.any(String),
				{
					apiKey: settings.apiKey,
					model: GEMINI_MODEL,
					temperature: settings.titleTemperature,
					topK: 1,
					topP: 1,
					maxOutputTokens: settings.titleMaxOutputTokens
				}
			);
		});

		it('should build prompt with content and maxTitleLength', async () => {
			const content = 'テストの本文内容';

			mockGeminiClient.generateContent.mockResolvedValue('Title');

			await generator.generateTitle(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const prompt = callArgs[0];

			expect(prompt).toContain(content);
			expect(prompt).toContain(`${settings.maxTitleLength}文字以内`);
			expect(prompt).toContain('短い日本語タイトル');
		});

		it('should use configured temperature value', async () => {
			const content = 'Test content';
			settings.titleTemperature = 0.5;

			mockGeminiClient.generateContent.mockResolvedValue('Title');

			await generator.generateTitle(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.temperature).toBe(0.5);
		});

		it('should use configured maxOutputTokens value', async () => {
			const content = 'Test content';
			settings.titleMaxOutputTokens = 128;

			mockGeminiClient.generateContent.mockResolvedValue('Title');

			await generator.generateTitle(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.maxOutputTokens).toBe(128);
		});

		it('should propagate errors from GeminiClient', async () => {
			const content = 'Test content';
			const error = new Error('API Error');

			mockGeminiClient.generateContent.mockRejectedValue(error);

			await expect(generator.generateTitle(content, settings))
				.rejects.toThrow('API Error');
		});

		it('should handle empty content', async () => {
			const content = '';

			mockGeminiClient.generateContent.mockResolvedValue('タイトル');

			await generator.generateTitle(content, settings);

			expect(mockGeminiClient.generateContent).toHaveBeenCalled();
		});

		it('should handle very long content', async () => {
			const content = 'あ'.repeat(10000);

			mockGeminiClient.generateContent.mockResolvedValue('長文のタイトル');

			const result = await generator.generateTitle(content, settings);

			expect(result).toBe('長文のタイトル');
			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const prompt = callArgs[0];
			expect(prompt).toContain(content);
		});

		it('should trim whitespace when truncating long titles', async () => {
			const content = 'Test content';
			const titleWithSpaces = 'Title with many spaces at position      ';

			mockGeminiClient.generateContent.mockResolvedValue(titleWithSpaces);
			vi.mocked(sanitizeTitle).mockReturnValue(titleWithSpaces);

			settings.maxTitleLength = 25;

			const result = await generator.generateTitle(content, settings);

			// Should not end with trailing space after substring
			expect(result).not.toMatch(/\s$/);
			expect(result.length).toBeLessThanOrEqual(25);
		});

		it('should handle title exactly at maxTitleLength', async () => {
			const content = 'Test content';
			const exactLengthTitle = '0123456789'.repeat(4); // 40 characters

			mockGeminiClient.generateContent.mockResolvedValue(exactLengthTitle);
			vi.mocked(sanitizeTitle).mockReturnValue(exactLengthTitle);

			settings.maxTitleLength = 40;

			const result = await generator.generateTitle(content, settings);

			expect(result).toBe(exactLengthTitle);
			expect(result.length).toBe(40);
		});

		it('should use GEMINI_MODEL constant', async () => {
			const content = 'Test content';

			mockGeminiClient.generateContent.mockResolvedValue('Title');

			await generator.generateTitle(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.model).toBe(GEMINI_MODEL);
			expect(config.model).toBe('gemini-2.5-flash-lite');
		});

		it('should set topK and topP to 1', async () => {
			const content = 'Test content';

			mockGeminiClient.generateContent.mockResolvedValue('Title');

			await generator.generateTitle(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const config = callArgs[1];

			expect(config.topK).toBe(1);
			expect(config.topP).toBe(1);
		});

		it('should include all required prompt elements', async () => {
			const content = 'テストコンテンツ';

			mockGeminiClient.generateContent.mockResolvedValue('Title');

			await generator.generateTitle(content, settings);

			const callArgs = mockGeminiClient.generateContent.mock.calls[0];
			const prompt = callArgs[0];

			expect(prompt).toContain('編集者');
			expect(prompt).toContain('短い日本語タイトル');
			expect(prompt).toContain('文字以内');
			expect(prompt).toContain('核となる名詞');
			expect(prompt).toContain('記号や絵文字は禁止');
			expect(prompt).toContain('本文:');
		});
	});
});
