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
	error?: {
		code?: number;
		message?: string;
		status?: string;
	};
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

		console.log('[Gemini API] リクエスト送信:', {
			url: this.baseUrl,
			model: config.model,
			promptLength: prompt.length
		});

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

			console.log('[Gemini API] レスポンス受信:', {
				status: response.status,
				statusText: response.status === 200 ? 'OK' : 'Error'
			});

			if (response.status !== 200) {
				// エラー詳細をコンソールに出力
				let errorDetails;
				try {
					errorDetails = typeof response.json === 'object' ? response.json : JSON.parse(response.text);
				} catch {
					errorDetails = { rawText: response.text };
				}

				console.error('[Gemini API] エラー詳細:', {
					status: response.status,
					headers: response.headers,
					errorBody: errorDetails
				});

				// エラーメッセージを整形
				const errorMessage = errorDetails?.error?.message || response.text;
				const errorCode = errorDetails?.error?.code || response.status;
				const errorStatus = errorDetails?.error?.status || 'UNKNOWN';

				throw new Error(`Gemini APIエラー [${errorCode} ${errorStatus}]: ${errorMessage}`);
			}

			const data: GeminiResponse = response.json;
			const text = this.extractText(data);

			if (!text) {
				console.error('[Gemini API] レスポンス解析失敗:', data);
				throw new Error('Gemini APIからのレスポンスを解析できませんでした。');
			}

			console.log('[Gemini API] 成功:', {
				responseLength: text.length
			});

			return text.trim();

		} catch (error) {
			console.error('[Gemini API] 例外発生:', error);
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
