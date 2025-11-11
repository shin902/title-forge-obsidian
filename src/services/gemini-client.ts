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

				// ヘッダーの重要情報を抽出
				const headers = response.headers || {};
				const importantHeaders = {
					'content-type': headers['content-type'],
					'x-goog-api-key-expired': headers['x-goog-api-key-expired'],
					'x-goog-quota-user': headers['x-goog-quota-user'],
					'x-goog-api-key-type': headers['x-goog-api-key-type'],
					'retry-after': headers['retry-after'],
					'date': headers['date']
				};

				console.error('[Gemini API] エラー詳細:', {
					status: response.status,
					model: config.model,
					apiKeyPrefix: config.apiKey.substring(0, 8) + '...',
					headers: importantHeaders,
					allHeaderKeys: Object.keys(headers),
					errorBody: errorDetails
				});

				// 429エラーの診断情報
				if (response.status === 429) {
					console.error('[Gemini API] 429エラー診断:');
					console.error('  - モデル名:', config.model, '(有効: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro)');
					console.error('  - APIキー:', config.apiKey.substring(0, 12) + '...' + config.apiKey.substring(config.apiKey.length - 4));
					console.error('  - エラーメッセージ:', errorDetails?.error?.message);

					// 推奨アクション
					console.warn('[Gemini API] 推奨アクション:');
					console.warn('  1. Google AI Studio (https://aistudio.google.com/apikey) でAPIキーのクォータを確認');
					console.warn('  2. 新しいAPIキーを作成して試す');
					console.warn('  3. プラグイン設定でモデルを gemini-2.5-flash に変更');
					console.warn('  4. 既存のユーザーは、設定画面でモデルを gemini-2.5-flash に変更してください');
					console.warn('  5. 1-2分待ってから再試行');
				}

				// エラーメッセージを整形
				const errorMessage = errorDetails?.error?.message || response.text;
				const errorCode = errorDetails?.error?.code || response.status;
				const errorStatus = errorDetails?.error?.status || 'UNKNOWN';

				throw new Error(`Gemini APIエラー [${errorCode} ${errorStatus}]: ${errorMessage}`);
			}

			const data: GeminiResponse = response.json;

			// レスポンス構造をデバッグ出力
			const firstCandidate = data.candidates?.[0];
			console.log('[Gemini API] レスポンス構造:', {
				hasCandidates: !!data.candidates,
				candidatesLength: data.candidates?.length,
				firstCandidate: firstCandidate,
				candidateKeys: firstCandidate ? Object.keys(firstCandidate) : [],
				content: firstCandidate?.content,
				contentKeys: firstCandidate?.content ? Object.keys(firstCandidate.content) : [],
				parts: firstCandidate?.content?.parts,
				fullResponse: data
			});

			// JSON文字列として出力（コピー可能）
			console.log('[Gemini API] firstCandidate JSON:', JSON.stringify(firstCandidate, null, 2));

			const text = this.extractText(data);

			if (!text) {
				console.error('[Gemini API] レスポンス解析失敗:', {
					data: data,
					candidate: data.candidates?.[0],
					content: data.candidates?.[0]?.content,
					parts: data.candidates?.[0]?.content?.parts
				});
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
