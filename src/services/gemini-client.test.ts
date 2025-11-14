import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient, GeminiConfig, GeminiResponse } from './gemini-client';
import { RequestUrlResponse } from 'obsidian';

// Mock Obsidian's requestUrl function
vi.mock('obsidian', () => ({
	requestUrl: vi.fn()
}));

import { requestUrl } from 'obsidian';
const mockRequestUrl = vi.mocked(requestUrl);

describe('GeminiClient', () => {
	let client: GeminiClient;
	let config: GeminiConfig;

	beforeEach(() => {
		client = new GeminiClient();
		config = {
			apiKey: 'AIzaSyD-test_1234567890',
			model: 'gemini-pro',
			temperature: 0.7,
			topK: 40,
			topP: 0.95,
			maxOutputTokens: 1024
		};
		vi.clearAllMocks();
	});

	describe('generateContent', () => {
		it('should successfully generate content with valid response', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: 'Generated title'
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			const result = await client.generateContent('Test prompt', config);

			expect(result).toBe('Generated title');
			expect(mockRequestUrl).toHaveBeenCalledWith({
				url: expect.stringContaining('gemini-pro:generateContent?key=AIzaSyD-test_1234567890'),
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: expect.stringContaining('Test prompt'),
				throw: false
			});
		});

		it('should trim whitespace from generated content', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: '  Generated title with spaces  '
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			const result = await client.generateContent('Test prompt', config);

			expect(result).toBe('Generated title with spaces');
		});

		it('should include correct generation config in request', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: 'test'
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await client.generateContent('Test prompt', config);

			const callArgs = mockRequestUrl.mock.calls[0][0];
			const body = JSON.parse(callArgs.body as string);

			expect(body.generationConfig).toEqual({
				temperature: 0.7,
				topK: 40,
				topP: 0.95,
				maxOutputTokens: 1024
			});
		});

		it('should throw error when API returns non-200 status', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 400,
				text: 'Bad Request',
				json: {},
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIエラー: 400 Bad Request');
		});

		it('should throw error when API returns 401 unauthorized', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 401,
				text: 'Unauthorized',
				json: {},
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIエラー: 401 Unauthorized');
		});

		it('should throw error when API returns 500 server error', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 500,
				text: 'Internal Server Error',
				json: {},
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIエラー: 500 Internal Server Error');
		});

		it('should throw error when response has no candidates', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: []
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIからのレスポンスを解析できませんでした。');
		});

		it('should throw error when response has no content', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: undefined
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIからのレスポンスを解析できませんでした。');
		});

		it('should throw error when response has no parts', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: []
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIからのレスポンスを解析できませんでした。');
		});

		it('should throw error when response has no text in parts', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: undefined
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIからのレスポンスを解析できませんでした。');
		});

		it('should throw error when response text is empty string', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: ''
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Gemini APIからのレスポンスを解析できませんでした。');
		});

		it('should throw network error when requestUrl fails', async () => {
			mockRequestUrl.mockRejectedValue(new Error('Network error'));

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('Network error');
		});

		it('should throw generic network error for non-Error exceptions', async () => {
			mockRequestUrl.mockRejectedValue('String error');

			await expect(client.generateContent('Test prompt', config))
				.rejects.toThrow('ネットワークエラーが発生しました。接続を確認してください。');
		});

		it('should handle multiple candidates and use first one', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: 'First candidate'
									}
								]
							}
						},
						{
							content: {
								parts: [
									{
										text: 'Second candidate'
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			const result = await client.generateContent('Test prompt', config);

			expect(result).toBe('First candidate');
		});

		it('should construct correct URL with model and API key', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: 'test'
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			await client.generateContent('Test prompt', config);

			const callArgs = mockRequestUrl.mock.calls[0][0];
			expect(callArgs.url).toBe(
				'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyD-test_1234567890'
			);
		});

		it('should send prompt in correct request body structure', async () => {
			const mockResponse: RequestUrlResponse = {
				status: 200,
				text: 'success',
				json: {
					candidates: [
						{
							content: {
								parts: [
									{
										text: 'test'
									}
								]
							}
						}
					]
				} as GeminiResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0)
			};

			mockRequestUrl.mockResolvedValue(mockResponse);

			const testPrompt = 'This is a test prompt';
			await client.generateContent(testPrompt, config);

			const callArgs = mockRequestUrl.mock.calls[0][0];
			const body = JSON.parse(callArgs.body as string);

			expect(body.contents).toEqual([{
				parts: [{
					text: testPrompt
				}]
			}]);
		});
	});
});
