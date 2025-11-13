import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteNamerPlugin from '../main';
import { validateApiKey } from '../utils/validator';

export class NoteNamerSettingTab extends PluginSettingTab {
	plugin: NoteNamerPlugin;
	private validationMessage: HTMLElement | null = null;
	private toggleButtonListener: ((this: HTMLElement, ev: MouseEvent) => any) | null = null;
	private toggleButton: HTMLElement | null = null;

	constructor(app: App, plugin: NoteNamerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Cleanup method to prevent memory leaks
	hide(): void {
		this.cleanupEventListeners();
	}

	private cleanupEventListeners(): void {
		if (this.toggleButton && this.toggleButtonListener) {
			this.toggleButton.removeEventListener('click', this.toggleButtonListener);
			this.toggleButtonListener = null;
			this.toggleButton = null;
		}
	}

	display(): void {
		const { containerEl } = this;

		// Clean up any existing event listeners
		this.cleanupEventListeners();

		containerEl.empty();

		// Privacy Notice - Fixed XSS vulnerability by using DOM methods instead of innerHTML
		const privacyNotice = containerEl.createEl('div', {
			cls: 'setting-item-description'
		});
		privacyNotice.createEl('strong', { text: 'プライバシーに関する注意:' });
		privacyNotice.createEl('br');
		privacyNotice.appendText('• このプラグインは、ノートの内容をGoogle Gemini APIに送信します。機密情報を含むノートでの使用にはご注意ください。');
		privacyNotice.createEl('br');
		privacyNotice.appendText('• APIキーはObsidianのVault内にローカルに保存されます（data.json）。Vaultのセキュリティを適切に管理してください。');

		containerEl.createEl('br');

		// API Settings Section
		containerEl.createEl('h2', { text: 'API設定' });

		const apiKeySetting = new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Gemini APIキーを入力してください');

		apiKeySetting.addText(text => {
			text
				.setPlaceholder('AIza...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();

					// Validate and show feedback using class scope
					if (this.validationMessage) {
						this.validationMessage.remove();
						this.validationMessage = null;
					}

					if (value && !validateApiKey(value)) {
						this.validationMessage = containerEl.createEl('div', {
							text: '⚠️ APIキーの形式が正しくない可能性があります（20文字以上、"AI"で始まる必要があります）',
							cls: 'setting-item-description mod-warning'
						});
						apiKeySetting.settingEl.insertAdjacentElement('afterend', this.validationMessage);
					}
				});

			// Set as password field
			text.inputEl.type = 'password';

			// Disable autocomplete
			text.inputEl.setAttribute('autocomplete', 'off');

			// Add visibility toggle button with proper cleanup
			const parentEl = text.inputEl.parentElement;
			if (!parentEl) {
				console.warn('NoteNamer: Failed to create API key toggle button - parent element not found');
				return;
			}

			this.toggleButton = parentEl.createEl('button', {
				text: '👁️',
				cls: 'api-key-toggle-btn'
			});

			this.toggleButton.setAttribute('type', 'button');
			this.toggleButton.setAttribute('aria-label', 'Toggle API key visibility');

			// Add CSS class instead of inline styles
			this.toggleButton.addClass('api-key-toggle-btn');

			// Store listener reference for cleanup
			this.toggleButtonListener = () => {
				if (text.inputEl.type === 'password') {
					text.inputEl.type = 'text';
					if (this.toggleButton) this.toggleButton.textContent = '🙈';
				} else {
					text.inputEl.type = 'password';
					if (this.toggleButton) this.toggleButton.textContent = '👁️';
				}
			};

			this.toggleButton.addEventListener('click', this.toggleButtonListener);

			// Show initial validation if API key is invalid
			const currentKey = this.plugin.settings.apiKey;
			if (currentKey && !validateApiKey(currentKey)) {
				this.validationMessage = containerEl.createEl('div', {
					text: '⚠️ 保存されているAPIキーの形式が正しくない可能性があります',
					cls: 'setting-item-description mod-warning'
				});
				apiKeySetting.settingEl.insertAdjacentElement('afterend', this.validationMessage);
			}
		});

		// Add link to get API key - Fixed XSS vulnerability
		const apiKeyDesc = containerEl.createEl('div', {
			cls: 'setting-item-description'
		});
		apiKeyDesc.appendText('APIキーは');
		const link = apiKeyDesc.createEl('a', {
			text: 'こちら',
			href: 'https://aistudio.google.com/app/apikey'
		});
		link.setAttribute('target', '_blank');
		link.setAttribute('rel', 'noopener noreferrer');
		apiKeyDesc.appendText('から取得できます');

		// Title Generation Settings Section
		containerEl.createEl('h2', { text: 'タイトル生成設定' });

		new Setting(containerEl)
			.setName('最大タイトル長')
			.setDesc('生成されるタイトルの最大文字数')
			.addSlider(slider => slider
				.setLimits(10, 100, 5)
				.setValue(this.plugin.settings.maxTitleLength)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxTitleLength = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('タイトル生成の創造性（0.0-1.0、低いほど決定的）')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.titleTemperature)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.titleTemperature = value;
					await this.plugin.saveSettings();
				}));

		// Tag Generation Settings Section
		containerEl.createEl('h2', { text: 'タグ生成設定' });

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('タグ生成の創造性（0.0-1.0、低いほど決定的）')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.tagTemperature)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.tagTemperature = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('最大コンテンツ長')
			.setDesc('タグ生成に使用する本文の最大文字数')
			.addSlider(slider => slider
				.setLimits(50, 500, 25)
				.setValue(this.plugin.settings.maxContentLength)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxContentLength = value;
					await this.plugin.saveSettings();
				}));

		// Display Settings Section
		containerEl.createEl('h2', { text: '表示設定' });

		new Setting(containerEl)
			.setName('リボンアイコンを表示')
			.setDesc('左サイドバーにアイコンを表示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRibbonIcons)
				.onChange(async (value) => {
					this.plugin.settings.showRibbonIcons = value;
					await this.plugin.saveSettings();
					// Require reload for this change
					containerEl.createEl('div', {
						text: '変更を反映するにはプラグインを再読み込みしてください',
						cls: 'mod-warning'
					});
				}));

		new Setting(containerEl)
			.setName('通知を表示')
			.setDesc('操作完了時に通知メッセージを表示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableNotifications)
				.onChange(async (value) => {
					this.plugin.settings.enableNotifications = value;
					await this.plugin.saveSettings();
				}));
	}
}
