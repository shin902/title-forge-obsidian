import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteNamerPlugin from '../main';
import { validateApiKey } from '../utils/validator';

export class NoteNamerSettingTab extends PluginSettingTab {
	plugin: NoteNamerPlugin;

	constructor(app: App, plugin: NoteNamerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Privacy Notice
		const privacyNotice = containerEl.createEl('div', {
			cls: 'setting-item-description'
		});
		privacyNotice.innerHTML =
			'<strong>プライバシーに関する注意:</strong><br>' +
			'• このプラグインは、ノートの内容をGoogle Gemini APIに送信します。機密情報を含むノートでの使用にはご注意ください。<br>' +
			'• APIキーはObsidianのVault内にローカルに保存されます（data.json）。Vaultのセキュリティを適切に管理してください。';

		containerEl.createEl('br');

		// API Settings Section
		containerEl.createEl('h2', { text: 'API設定' });

		const apiKeySetting = new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Gemini APIキーを入力してください');

		let validationMessage: HTMLElement | null = null;

		apiKeySetting.addText(text => {
			text
				.setPlaceholder('AIza...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();

					// Validate and show feedback
					if (validationMessage) {
						validationMessage.remove();
						validationMessage = null;
					}

					if (value && !validateApiKey(value)) {
						validationMessage = containerEl.createEl('div', {
							text: '⚠️ APIキーの形式が正しくない可能性があります（20文字以上、"AI"で始まる必要があります）',
							cls: 'setting-item-description mod-warning'
						});
						apiKeySetting.settingEl.insertAdjacentElement('afterend', validationMessage);
					}
				});

			// Set as password field
			text.inputEl.type = 'password';

			// Disable autocomplete
			text.inputEl.setAttribute('autocomplete', 'off');

			// Add visibility toggle button
			const toggleBtn = text.inputEl.parentElement?.createEl('button', {
				text: '👁️',
				cls: 'api-key-toggle-btn'
			});

			if (toggleBtn) {
				toggleBtn.setAttribute('type', 'button');
				toggleBtn.setAttribute('aria-label', 'Toggle API key visibility');
				toggleBtn.style.marginLeft = '8px';
				toggleBtn.style.cursor = 'pointer';
				toggleBtn.style.padding = '4px 8px';
				toggleBtn.style.border = '1px solid var(--background-modifier-border)';
				toggleBtn.style.borderRadius = '4px';
				toggleBtn.style.background = 'var(--interactive-normal)';

				toggleBtn.addEventListener('click', () => {
					if (text.inputEl.type === 'password') {
						text.inputEl.type = 'text';
						toggleBtn.textContent = '🙈';
					} else {
						text.inputEl.type = 'password';
						toggleBtn.textContent = '👁️';
					}
				});
			}
		});

		// Add link to get API key
		const apiKeyDesc = containerEl.createEl('div', {
			cls: 'setting-item-description'
		});
		apiKeyDesc.innerHTML = 'APIキーは<a href="https://aistudio.google.com/app/apikey" target="_blank">こちら</a>から取得できます';

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
