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
	private readonly maxRetries = 3; // Maximum number of retries for 429 errors
	private readonly initialRetryDelay = 10000; // Initial retry delay in ms (10 seconds)

	/**
	 * Generates content using Gemini API with retry logic for rate limiting
	 * @param prompt - The prompt to send to Gemini
	 * @param config - Configuration for the API call
	 * @returns Generated text
	 * @throws Error if API call fails after all retries
	 */
	async generateContent(prompt: string, config: GeminiConfig): Promise<string> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				return await this.generateContentInternal(prompt, config, attempt);
			} catch (error) {
				console.log(`[Gemini API Debug] Caught error in generateContent, attempt ${attempt}/${this.maxRetries}`);

				if (error instanceof Error) {
					lastError = error;

					console.log(`[Gemini API Debug] Error message: "${error.message}"`);

					// Check if it's a 429 error and we have retries left
					const is429Error = error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED');
					console.log(`[Gemini API Debug] is429Error: ${is429Error}, attempt < maxRetries: ${attempt < this.maxRetries}`);

					if (is429Error && attempt < this.maxRetries) {
						const delay = this.initialRetryDelay * Math.pow(2, attempt);
						console.warn(`[Gemini API] 429エラー検出: ${attempt + 1}回目のリトライを${delay / 1000}秒後に実行します...`);
						await this.sleep(delay);
						continue;
					} else if (!is429Error) {
						console.log(`[Gemini API Debug] Not a 429 error, throwing immediately`);
						throw error;
					} else {
						console.error(`[Gemini API] ${this.maxRetries}回のリトライ後も429エラーが解決しませんでした。`);
						throw new Error(`Gemini APIのレート制限: ${this.maxRetries}回リトライしましたが、サーバーが混雑しています。しばらく待ってから再度お試しください。`);
					}
				} else {
					console.log(`[Gemini API Debug] Error is not an Error instance`);
					throw error;
				}
			}
		}

		throw lastError || new Error('リクエストが失敗しました。');
	}

	/**
	 * Internal method to generate content using Gemini API
	 * @param prompt - The prompt to send to Gemini
	 * @param config - Configuration for the API call
	 * @param attempt - Current retry attempt number
	 * @returns Generated text
	 * @throws Error if API call fails
	 */
	private async generateContentInternal(prompt: string, config: GeminiConfig, attempt: number): Promise<string> {
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

		const attemptLabel = attempt > 0 ? ` (リトライ ${attempt}回目)` : '';
		console.log(`[Gemini API] リクエスト送信${attemptLabel}:`, {
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
			// Don't log here - let the outer generateContent handle logging and retries
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

	/**
	 * Sleep for a specified duration
	 * @param ms - Duration in milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
