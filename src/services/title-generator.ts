import { GeminiClient, GeminiConfig } from './gemini-client';
import { sanitizeTitle } from '../utils/text-sanitizer';
import { TitleForgeSettings, GEMINI_MODEL } from '../settings';

export class TitleGenerator {
	private geminiClient: GeminiClient;

	constructor() {
		this.geminiClient = new GeminiClient();
	}

	/**
	 * Generates a title from content using Gemini API
	 * @param content - The note content
	 * @param settings - Plugin settings
	 * @returns Generated title
	 * @throws Error if generation fails
	 */
	async generateTitle(content: string, settings: TitleForgeSettings): Promise<string> {
		const prompt = this.buildPrompt(content, settings.maxTitleLength);

		const config: GeminiConfig = {
			apiKey: settings.apiKey,
			model: GEMINI_MODEL,
			temperature: settings.titleTemperature,
			topK: 1,
			topP: 1,
			maxOutputTokens: settings.titleMaxOutputTokens
		};

		const generatedTitle = await this.geminiClient.generateContent(prompt, config);
		const sanitized = sanitizeTitle(generatedTitle);

		// Ensure title doesn't exceed max length
		if (sanitized.length > settings.maxTitleLength) {
			return sanitized.substring(0, settings.maxTitleLength).trim();
		}

		return sanitized;
	}

	/**
	 * Builds the prompt for title generation
	 * @param content - The note content
	 * @param maxTitleLength - Maximum title length
	 * @returns Formatted prompt
	 */
	private buildPrompt(content: string, maxTitleLength: number): string {
		return `あなたは編集者です。以下の本文から、検索性と再利用性の高い短い日本語タイトルを1つ作ってください。
要件:
- ${maxTitleLength}文字以内
- 内容の核となる名詞を含める
- 記号や絵文字は禁止
- 「メモ/ノート/日記」などの汎用接頭辞は付けない
- 出力はタイトル文字列のみ

本文:
${content}`;
	}
}
