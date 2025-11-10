import { requestUrl, RequestUrlResponse } from 'obsidian';

export interface GeminiConfig {
	apiKey: string;
	model: string;
	temperature: number;
	topK: number;
	topP: number;
	maxOutputTokens: number;
}

export interface GeminiResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				text?: string;
			}>;
		};
	}>;
}

export class GeminiClient {
	private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
	private readonly timeout = 30000; // 30 seconds

	/**
	 * Generates content using Gemini API
	 * @param prompt - The prompt to send to Gemini
	 * @param config - Configuration for the API call
	 * @returns Generated text
	 * @throws Error if API call fails
	 */
	async generateContent(prompt: string, config: GeminiConfig): Promise<string> {
		const url = `${this.baseUrl}/${config.model}:generateContent?key=${config.apiKey}`;

		const requestBody = {
			contents: [{
				parts: [{
					text: prompt
				}]
			}],
			generationConfig: {
				temperature: config.temperature,
				topK: config.topK,
				topP: config.topP,
				maxOutputTokens: config.maxOutputTokens
			}
		};

		try {
			const response: RequestUrlResponse = await requestUrl({
				url: url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody),
				throw: false
			});

			if (response.status !== 200) {
				throw new Error(`Gemini APIエラー: ${response.status} ${response.text}`);
			}

			const data: GeminiResponse = response.json;
			const text = this.extractText(data);

			if (!text) {
				throw new Error('Gemini APIからのレスポンスを解析できませんでした。');
			}

			return text.trim();

		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('ネットワークエラーが発生しました。接続を確認してください。');
		}
	}

	/**
	 * Extracts text from Gemini API response
	 * @param response - The API response
	 * @returns Extracted text or null
	 */
	private extractText(response: GeminiResponse): string | null {
		try {
			const candidate = response.candidates?.[0];
			const part = candidate?.content?.parts?.[0];
			return part?.text || null;
		} catch {
			return null;
		}
	}
}
