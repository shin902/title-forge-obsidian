import { App, Notice, Plugin, TFile, parseYaml, stringifyYaml } from 'obsidian';
import { NoteNamerSettings, DEFAULT_SETTINGS } from './settings';
import { NoteNamerSettingTab } from './ui/setting-tab';
import { TitleGenerator } from './services/title-generator';
import { TagGenerator } from './services/tag-generator';
import { validateApiKey, validateContent, arraysEqual } from './utils/validator';

export default class NoteNamerPlugin extends Plugin {
	settings: NoteNamerSettings;
	private titleGenerator: TitleGenerator;
	private tagGenerator: TagGenerator;
	private ribbonIconTitle: HTMLElement | null = null;
	private ribbonIconTag: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.titleGenerator = new TitleGenerator();
		this.tagGenerator = new TagGenerator();

		// Add commands
		this.addCommand({
			id: 'note-namer-generate-title',
			name: 'Generate title with AI',
			callback: () => this.generateTitle()
		});

		this.addCommand({
			id: 'note-namer-generate-tags',
			name: 'Generate tags with AI',
			callback: () => this.generateTags()
		});

		// Add ribbon icons if enabled
		if (this.settings.showRibbonIcons) {
			this.addRibbonIcons();
		}

		// Add settings tab
		this.addSettingTab(new NoteNamerSettingTab(this.app, this));
	}

	onunload() {
		// Clean up ribbon icons
		this.ribbonIconTitle?.remove();
		this.ribbonIconTag?.remove();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private addRibbonIcons() {
		this.ribbonIconTitle = this.addRibbonIcon(
			'heading',
			'Generate title with AI',
			() => this.generateTitle()
		);

		this.ribbonIconTag = this.addRibbonIcon(
			'tag',
			'Generate tags with AI',
			() => this.generateTags()
		);
	}

	private async generateTitle() {
		try {
			// Validate API key
			if (!validateApiKey(this.settings.apiKey)) {
				this.showError('GEMINI_API_KEY が未設定または不正です。設定画面でAPIキーを入力してください。');
				return;
			}

			// Get active file
			const file = this.app.workspace.getActiveFile();
			if (!file) {
				this.showError('アクティブなファイルがありません。ノートを開いて実行してください。');
				return;
			}

			// Read file content
			const content = await this.app.vault.read(file);
			if (!validateContent(content)) {
				this.showError('本文が空です。テキストを入力してから実行してください。');
				return;
			}

			// Show processing notice
			const notice = new Notice('タイトルを生成中...', 0);

			try {
				// Generate title
				const newTitle = await this.titleGenerator.generateTitle(content, this.settings);

				// Get current file name without extension
				const currentTitle = file.basename;

				// Check idempotency
				if (currentTitle === newTitle) {
					notice.hide();
					this.showNotification(`タイトルは既に最新です: ${newTitle}`);
					return;
				}

				// Rename file
				const newPath = file.parent ? `${file.parent.path}/${newTitle}.md` : `${newTitle}.md`;
				await this.app.fileManager.renameFile(file, newPath);

				notice.hide();
				this.showNotification(`タイトル更新: ${currentTitle} → ${newTitle}`);

			} catch (error) {
				notice.hide();
				throw error;
			}

		} catch (error) {
			console.error('[Note Namer] タイトル生成エラー:', error);
			if (error instanceof Error) {
				this.showError(error.message);
			} else {
				this.showError('タイトル生成に失敗しました。');
			}
		}
	}

	private async generateTags() {
		try {
			// Validate API key
			if (!validateApiKey(this.settings.apiKey)) {
				this.showError('GEMINI_API_KEY が未設定または不正です。設定画面でAPIキーを入力してください。');
				return;
			}

			// Get active file
			const file = this.app.workspace.getActiveFile();
			if (!file) {
				this.showError('アクティブなファイルがありません。ノートを開いて実行してください。');
				return;
			}

			// Read file content
			const content = await this.app.vault.read(file);
			if (!validateContent(content)) {
				this.showError('本文が空です。テキストを入力してから実行してください。');
				return;
			}

			// Show processing notice
			const notice = new Notice('タグを生成中...', 0);

			try {
				// Generate tags
				const newTags = await this.tagGenerator.generateTags(content, this.settings);

				// Get current tags from frontmatter
				const currentTags = await this.getTagsFromFrontmatter(file);

				// Check idempotency
				if (arraysEqual(currentTags, newTags)) {
					notice.hide();
					this.showNotification(`タグは既に最新です: ${newTags.join(', ')}`);
					return;
				}

				// Update frontmatter with new tags
				await this.updateTagsInFrontmatter(file, newTags);

				notice.hide();
				this.showNotification(`タグを更新しました: ${newTags.join(', ')}`);

			} catch (error) {
				notice.hide();
				throw error;
			}

		} catch (error) {
			console.error('[Note Namer] タグ生成エラー:', error);
			if (error instanceof Error) {
				this.showError(error.message);
			} else {
				this.showError('タグ生成に失敗しました。');
			}
		}
	}

	private async getTagsFromFrontmatter(file: TFile): Promise<string[]> {
		const content = await this.app.vault.read(file);
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return [];
		}

		try {
			const frontmatter = parseYaml(match[1]);
			if (frontmatter && frontmatter.tags) {
				if (Array.isArray(frontmatter.tags)) {
					return frontmatter.tags;
				} else if (typeof frontmatter.tags === 'string') {
					return [frontmatter.tags];
				}
			}
		} catch {
			// Failed to parse frontmatter
		}

		return [];
	}

	private async updateTagsInFrontmatter(file: TFile, tags: string[]) {
		const content = await this.app.vault.read(file);
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
		const match = content.match(frontmatterRegex);

		let newContent: string;

		if (match) {
			// Update existing frontmatter
			try {
				const frontmatter = parseYaml(match[1]) || {};
				frontmatter.tags = tags;
				const newFrontmatter = stringifyYaml(frontmatter).trim();
				newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---\n`);
			} catch {
				// If parsing fails, create new frontmatter
				const newFrontmatter = stringifyYaml({ tags }).trim();
				newContent = `---\n${newFrontmatter}\n---\n${content.replace(frontmatterRegex, '')}`;
			}
		} else {
			// Add new frontmatter
			const newFrontmatter = stringifyYaml({ tags }).trim();
			newContent = `---\n${newFrontmatter}\n---\n${content}`;
		}

		await this.app.vault.modify(file, newContent);
	}

	private showNotification(message: string) {
		if (this.settings.enableNotifications) {
			new Notice(message);
		}
	}

	private showError(message: string) {
		new Notice(message, 5000);
	}
}
