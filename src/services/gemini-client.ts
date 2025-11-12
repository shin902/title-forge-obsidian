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
		try {
			// Try with model-specific configuration
			return await this.generateWithConfig(prompt, config, false);
		} catch (error) {
			// If MAX_TOKENS error occurs, retry with relaxed limits
			if (error instanceof Error && error.message.includes('MAX_TOKENS')) {
				console.warn('MAX_TOKENS error detected, retrying with relaxed limits...');
				return await this.generateWithConfig(prompt, config, true);
			}
			throw error;
		}
	}

	/**
	 * Internal method to generate content with specific configuration
	 * @param prompt - The prompt to send to Gemini
	 * @param config - Configuration for the API call
	 * @param useFallback - Whether to use fallback configuration with relaxed limits
	 * @returns Generated text
	 * @throws Error if API call fails
	 */
	private async generateWithConfig(
		prompt: string,
		config: GeminiConfig,
		useFallback: boolean
	): Promise<string> {
		const url = `${this.baseUrl}/${config.model}:generateContent?key=${config.apiKey}`;

		// Get appropriate generation config based on model and fallback flag
		const generationConfig = this.getGenerationConfig(config, useFallback);

		const requestBody = {
			contents: [{
				parts: [{
					text: prompt
				}]
			}],
			generationConfig
		};

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
	}

	/**
	 * Gets appropriate generation config based on model type
	 * @param config - Base configuration
	 * @param useFallback - Whether to use fallback configuration
	 * @returns Generation config object
	 */
	private getGenerationConfig(config: GeminiConfig, useFallback: boolean): any {
		const baseConfig: any = {
			temperature: config.temperature,
			topK: config.topK,
			topP: config.topP
		};

		// If using fallback, remove maxOutputTokens limit
		if (useFallback) {
			return baseConfig;
		}

		// Check if model is a reasoning model (contains "flash" or "pro" but not "flash-lite")
		const isReasoningModel = this.isReasoningModel(config.model);

		if (isReasoningModel) {
			// For reasoning models, omit maxOutputTokens to avoid token limit issues
			return baseConfig;
		} else {
			// For non-reasoning models (like flash-lite), keep the token limit
			baseConfig.maxOutputTokens = config.maxOutputTokens;
			return baseConfig;
		}
	}

	/**
	 * Checks if the model is a reasoning model (Gemini 2.5 Pro or Flash, but not Flash Lite)
	 * @param model - Model name
	 * @returns True if model is a reasoning model
	 */
	private isReasoningModel(model: string): boolean {
		const modelLower = model.toLowerCase();

		// Flash Lite is not a reasoning model
		if (modelLower.includes('flash-lite') || modelLower.includes('flash-thinking')) {
			return false;
		}

		// Check for Pro or Flash (which are reasoning models)
		return modelLower.includes('flash') || modelLower.includes('pro');
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
