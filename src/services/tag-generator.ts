import { GeminiClient, GeminiConfig } from './gemini-client';
import { normalizeTags, removeFrontmatter, truncateContent } from '../utils/text-sanitizer';
import { TitleForgeSettings, GEMINI_MODEL } from '../settings';

export class TagGenerator {
	private geminiClient: GeminiClient;

	constructor() {
		this.geminiClient = new GeminiClient();
	}

	/**
	 * Generates tags from content using Gemini API
	 * @param content - The note content (with frontmatter)
	 * @param settings - Plugin settings
	 * @returns Array of generated tags
	 * @throws Error if generation fails
	 */
	async generateTags(content: string, settings: TitleForgeSettings): Promise<string[]> {
		// Remove frontmatter for tag generation
		const contentWithoutFrontmatter = removeFrontmatter(content);

		// Truncate content to max length
		const truncated = truncateContent(contentWithoutFrontmatter, settings.maxContentLength);

		const prompt = this.buildPrompt(truncated);

		const config: GeminiConfig = {
			apiKey: settings.apiKey,
			model: GEMINI_MODEL,
			temperature: settings.tagTemperature,
			topK: 1,
			topP: 1,
			maxOutputTokens: settings.tagMaxOutputTokens
		};

		const generatedTags = await this.geminiClient.generateContent(prompt, config);
		const normalized = normalizeTags(generatedTags);

		return normalized;
	}

	/**
	 * Builds the prompt for tag generation
	 * @param content - The note content (without frontmatter)
	 * @returns Formatted prompt
	 */
	private buildPrompt(content: string): string {
		return `次のContentからキーワードを抽出しタグを日本語で生成してください。
追加のコメントなしで、カンマ区切りのリストとしてタグのみを返します。
複数の単語はハイフンで繋いでタグにしてください。

Content:
${content}`;
	}
}
