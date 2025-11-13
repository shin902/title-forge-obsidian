import { App, PluginSettingTab, Setting } from 'obsidian';
import TitleForgePlugin from '../main';

export class TitleForgeSettingTab extends PluginSettingTab {
	plugin: TitleForgePlugin;

	constructor(app: App, plugin: TitleForgePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Privacy Notice
		containerEl.createEl('div', {
			text: 'このプラグインは、ノートの内容をGoogle Gemini APIに送信します。機密情報を含むノートでの使用にはご注意ください。',
			cls: 'setting-item-description'
		});

		containerEl.createEl('br');

		// API Settings Section
		containerEl.createEl('h2', { text: 'API設定' });

		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Gemini APIキーを入力してください')
			.addText(text => {
				text
					.setPlaceholder('AIza...')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
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
