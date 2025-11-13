import { App, PluginSettingTab, Setting } from 'obsidian';
import TitleForgePlugin from '../main';
import { validateApiKey } from '../utils/validator';

export class TitleForgeSettingTab extends PluginSettingTab {
	plugin: TitleForgePlugin;
	private validationMessage: HTMLElement | null = null;
	private validationTimeout: ReturnType<typeof setTimeout> | null = null;
	private toggleButtonListener: (() => void) | null = null;
	private toggleButton: HTMLElement | null = null;
	private toggleContainer: HTMLElement | null = null;
	private isMounted: boolean = false;

	// Validation debounce delay in milliseconds
	private static readonly VALIDATION_DEBOUNCE_MS = 300;

	constructor(app: App, plugin: TitleForgePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Cleanup method to prevent memory leaks
	 * Called when settings tab is hidden or re-rendered
	 */
	hide(): void {
		this.isMounted = false;
		this.cleanup();
	}

	/**
	 * Cleans up all resources: event listeners, DOM elements, and timeouts
	 */
	private cleanup(): void {
		// Clean up validation timeout first to prevent race conditions
		if (this.validationTimeout) {
			clearTimeout(this.validationTimeout);
			this.validationTimeout = null;
		}

		// Clean up toggle button and its container
		if (this.toggleContainer) {
			// Remove event listener before removing from DOM
			if (this.toggleButton && this.toggleButtonListener) {
				this.toggleButton.removeEventListener('click', this.toggleButtonListener);
			}
			this.toggleContainer.remove();
			this.toggleContainer = null;
			this.toggleButton = null;
			this.toggleButtonListener = null;
		}

		// Clean up validation message
		if (this.validationMessage) {
			this.validationMessage.remove();
			this.validationMessage = null;
		}
	}

	/**
	 * Shows a validation warning message for API key
	 * @param message - The warning message to display
	 * @param settingEl - The setting element to insert the message after
	 */
	private showValidationWarning(message: string, settingEl: HTMLElement): void {
		// Clear any existing validation message
		if (this.validationMessage) {
			this.validationMessage.remove();
			this.validationMessage = null;
		}

		// Create new validation message
		this.validationMessage = settingEl.parentElement?.createEl('div', {
			text: message,
			cls: 'setting-item-description mod-warning'
		}) || null;

		if (this.validationMessage) {
			settingEl.insertAdjacentElement('afterend', this.validationMessage);
		}
	}

	display(): void {
		const { containerEl } = this;

		// Clean up any existing resources to prevent memory leaks
		this.cleanup();

		// Mark as mounted
		this.isMounted = true;

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

					// Debounce validation to prevent race conditions
					if (this.validationTimeout) {
						clearTimeout(this.validationTimeout);
					}

					this.validationTimeout = setTimeout(() => {
						// Check if tab is still mounted to prevent race condition
						if (!this.isMounted) {
							return;
						}

						// Show validation feedback for invalid API keys
						if (value && !validateApiKey(value)) {
							this.showValidationWarning(
								'⚠️ APIキーの形式が正しくない可能性があります（"AI"で始まる20文字以上である必要があります）',
								apiKeySetting.settingEl
							);
						} else if (this.validationMessage) {
							// Clear validation message when key becomes valid
							this.validationMessage.remove();
							this.validationMessage = null;
						}
					}, TitleForgeSettingTab.VALIDATION_DEBOUNCE_MS);
				});

			// Set as password field
			text.inputEl.type = 'password';

			// Disable autocomplete
			text.inputEl.setAttribute('autocomplete', 'off');

			// Add visibility toggle button with proper cleanup
			const parentEl = text.inputEl.parentElement;
			if (!parentEl) {
				// Log error but continue - toggle button is optional enhancement
				console.error('TitleForge: Cannot create API key toggle button - parent element not found. This should not happen.');
				// Continue without toggle button - field is still functional
				return;
			}

			// Create a container for the toggle button to ensure proper cleanup
			this.toggleContainer = parentEl.createEl('span', {
				cls: 'api-key-toggle-container'
			});

			this.toggleButton = this.toggleContainer.createEl('button', {
				text: '👁️',
				cls: 'api-key-toggle-btn'
			});

			this.toggleButton.setAttribute('type', 'button');
			this.toggleButton.setAttribute('aria-label', 'Show API key');

			// Store listener reference for cleanup
			this.toggleButtonListener = () => {
				if (text.inputEl.type === 'password') {
					text.inputEl.type = 'text';
					if (this.toggleButton) {
						this.toggleButton.textContent = '🙈';
						this.toggleButton.setAttribute('aria-label', 'Hide API key');
					}
				} else {
					text.inputEl.type = 'password';
					if (this.toggleButton) {
						this.toggleButton.textContent = '👁️';
						this.toggleButton.setAttribute('aria-label', 'Show API key');
					}
				}
			};

			this.toggleButton.addEventListener('click', this.toggleButtonListener);

			// Note: Initial validation on load removed to avoid distracting users
			// who are about to fix their API key. Validation will trigger on first keystroke.
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
