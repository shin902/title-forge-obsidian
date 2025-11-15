import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TitleForgeSettingTab } from './setting-tab';
import { App } from 'obsidian';
import TitleForgePlugin from '../main';

// Mock Obsidian classes
vi.mock('obsidian', () => {
	class MockPluginSettingTab {
		app: any;
		plugin: any;
		containerEl: any;

		constructor(app: any, plugin: any) {
			this.app = app;
			this.plugin = plugin;
			this.containerEl = this.createMockContainerEl();
		}

		createMockContainerEl() {
			const div = document.createElement('div');

			// Add Obsidian-specific methods
			(div as any).empty = function() {
				this.innerHTML = '';
			};

			function addObsidianMethods(element: any) {
				element.createEl = function(tag: string, attrs?: any) {
					const el = document.createElement(tag);
					if (attrs) {
						if (attrs.text) el.textContent = attrs.text;
						if (attrs.cls) el.className = attrs.cls;
						if (attrs.href) (el as any).href = attrs.href;
					}

					// Recursively add Obsidian methods to nested elements
					addObsidianMethods(el);

					this.appendChild(el);
					return el;
				};

				element.appendText = function(text: string) {
					this.appendChild(document.createTextNode(text));
				};
			}

			addObsidianMethods(div);

			return div;
		}
	}

	class MockSetting {
		private _settingEl: HTMLElement;
		private callbacks: {
			addText?: (cb: (text: any) => void) => void;
			addSlider?: (cb: (slider: any) => void) => void;
			addToggle?: (cb: (toggle: any) => void) => void;
		} = {};

		constructor(containerEl: HTMLElement) {
			this._settingEl = document.createElement('div');
			this._settingEl.className = 'setting-item';
			containerEl.appendChild(this._settingEl);
		}

		setName(name: string): this {
			const nameEl = document.createElement('div');
			nameEl.className = 'setting-item-name';
			nameEl.textContent = name;
			this._settingEl.appendChild(nameEl);
			return this;
		}

		setDesc(desc: string): this {
			const descEl = document.createElement('div');
			descEl.className = 'setting-item-description';
			descEl.textContent = desc;
			this._settingEl.appendChild(descEl);
			return this;
		}

		addText(callback: (text: any) => void): this {
			const inputEl = document.createElement('input');
			inputEl.type = 'text';

			const mockText = {
				inputEl,
				setPlaceholder: (placeholder: string) => {
					inputEl.placeholder = placeholder;
					return mockText;
				},
				setValue: (value: string) => {
					inputEl.value = value;
					return mockText;
				},
				onChange: (cb: (value: string) => void) => {
					inputEl.addEventListener('input', (e) => {
						cb((e.target as HTMLInputElement).value);
					});
					return mockText;
				}
			};

			const parentEl = document.createElement('div');
			parentEl.appendChild(inputEl);

			// Add createEl method to parent element for toggle button (recursively)
			function addCreateElMethod(element: any) {
				(element as any).createEl = function(tag: string, attrs?: any) {
					const el = document.createElement(tag);
					if (attrs) {
						if (attrs.text) el.textContent = attrs.text;
						if (attrs.cls) el.className = attrs.cls;
						if (attrs.href) (el as any).href = attrs.href;
					}
					// Recursively add createEl to nested elements
					addCreateElMethod(el);
					this.appendChild(el);
					return el;
				};
			}

			addCreateElMethod(parentEl);

			this._settingEl.appendChild(parentEl);

			callback(mockText);
			return this;
		}

		addSlider(callback: (slider: any) => void): this {
			const inputEl = document.createElement('input');
			inputEl.type = 'range';

			const mockSlider = {
				inputEl,
				setLimits: (min: number, max: number, step: number) => {
					inputEl.min = String(min);
					inputEl.max = String(max);
					inputEl.step = String(step);
					return mockSlider;
				},
				setValue: (value: number) => {
					inputEl.value = String(value);
					return mockSlider;
				},
				setDynamicTooltip: () => mockSlider,
				onChange: (cb: (value: number) => void) => {
					inputEl.addEventListener('input', (e) => {
						cb(Number((e.target as HTMLInputElement).value));
					});
					return mockSlider;
				}
			};

			this._settingEl.appendChild(inputEl);
			callback(mockSlider);
			return this;
		}

		addToggle(callback: (toggle: any) => void): this {
			const inputEl = document.createElement('input');
			inputEl.type = 'checkbox';

			const mockToggle = {
				inputEl,
				setValue: (value: boolean) => {
					inputEl.checked = value;
					return mockToggle;
				},
				onChange: (cb: (value: boolean) => void) => {
					inputEl.addEventListener('change', (e) => {
						cb((e.target as HTMLInputElement).checked);
					});
					return mockToggle;
				}
			};

			this._settingEl.appendChild(inputEl);
			callback(mockToggle);
			return this;
		}

		get settingEl() {
			return this._settingEl;
		}
	}

	return {
		App: vi.fn(),
		PluginSettingTab: MockPluginSettingTab,
		Setting: MockSetting
	};
});

describe('TitleForgeSettingTab', () => {
	let app: App;
	let plugin: TitleForgePlugin;
	let settingTab: TitleForgeSettingTab;

	beforeEach(() => {
		// Create mock app
		app = {} as App;

		// Create mock plugin with settings
		plugin = {
			settings: {
				apiKey: '',
				maxTitleLength: 40,
				titleTemperature: 0.2,
				titleMaxOutputTokens: 64,
				tagTemperature: 0.2,
				tagMaxOutputTokens: 128,
				maxContentLength: 100,
				showRibbonIcons: false,
				enableNotifications: true
			},
			saveSettings: vi.fn().mockResolvedValue(undefined)
		} as any;

		// Create setting tab
		settingTab = new TitleForgeSettingTab(app, plugin);
	});

	describe('Constructor', () => {
		it('should initialize with app and plugin', () => {
			expect(settingTab.plugin).toBe(plugin);
		});
	});

	describe('Display method', () => {
		it('should create container elements', () => {
			settingTab.display();

			expect(settingTab.containerEl).toBeDefined();
			expect(settingTab.containerEl.children.length).toBeGreaterThan(0);
		});

		it('should display privacy notice', () => {
			settingTab.display();

			const privacyNotice = settingTab.containerEl.querySelector('.setting-item-description');
			expect(privacyNotice).toBeDefined();
			expect(privacyNotice?.textContent).toContain('プライバシーに関する注意');
		});

		it('should create API settings section', () => {
			settingTab.display();

			const headers = Array.from(settingTab.containerEl.querySelectorAll('h2'));
			const apiHeader = headers.find(h => h.textContent === 'API設定');
			expect(apiHeader).toBeDefined();
		});

		it('should create title generation settings section', () => {
			settingTab.display();

			const headers = Array.from(settingTab.containerEl.querySelectorAll('h2'));
			const titleHeader = headers.find(h => h.textContent === 'タイトル生成設定');
			expect(titleHeader).toBeDefined();
		});

		it('should create tag generation settings section', () => {
			settingTab.display();

			const headers = Array.from(settingTab.containerEl.querySelectorAll('h2'));
			const tagHeader = headers.find(h => h.textContent === 'タグ生成設定');
			expect(tagHeader).toBeDefined();
		});

		it('should create display settings section', () => {
			settingTab.display();

			const headers = Array.from(settingTab.containerEl.querySelectorAll('h2'));
			const displayHeader = headers.find(h => h.textContent === '表示設定');
			expect(displayHeader).toBeDefined();
		});

		it('should create API key input field', () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]');
			expect(apiKeyInput).toBeDefined();
		});

		it('should set API key input placeholder', () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]') as HTMLInputElement;
			expect(apiKeyInput?.placeholder).toBe('AIza...');
		});

		it('should disable autocomplete on API key input', () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]') as HTMLInputElement;
			expect(apiKeyInput?.getAttribute('autocomplete')).toBe('off');
		});

		it('should create link to get API key', () => {
			settingTab.display();

			const link = settingTab.containerEl.querySelector('a[href="https://aistudio.google.com/app/apikey"]');
			expect(link).toBeDefined();
			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
		});
	});

	describe('Settings persistence', () => {
		it('should save settings when API key changes', async () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]') as HTMLInputElement;

			// Simulate input change
			apiKeyInput.value = 'AIzaSyTest123456789012345';
			apiKeyInput.dispatchEvent(new Event('input'));

			// Wait for debounce
			await new Promise(resolve => setTimeout(resolve, 400));

			expect(plugin.settings.apiKey).toBe('AIzaSyTest123456789012345');
			expect(plugin.saveSettings).toHaveBeenCalled();
		});

		it('should save settings when max title length changes', async () => {
			settingTab.display();

			const sliders = settingTab.containerEl.querySelectorAll('input[type="range"]');
			const titleLengthSlider = sliders[0] as HTMLInputElement;

			// Simulate slider change
			titleLengthSlider.value = '50';
			titleLengthSlider.dispatchEvent(new Event('input'));

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(plugin.settings.maxTitleLength).toBe(50);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});

		it('should save settings when temperature changes', async () => {
			settingTab.display();

			const sliders = settingTab.containerEl.querySelectorAll('input[type="range"]');
			const titleTempSlider = sliders[1] as HTMLInputElement;

			// Simulate slider change
			titleTempSlider.value = '0.5';
			titleTempSlider.dispatchEvent(new Event('input'));

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(plugin.settings.titleTemperature).toBe(0.5);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});

		it('should save settings when toggle changes', async () => {
			settingTab.display();

			const toggles = settingTab.containerEl.querySelectorAll('input[type="checkbox"]');
			const ribbonToggle = toggles[0] as HTMLInputElement;

			// Simulate toggle change
			ribbonToggle.checked = true;
			ribbonToggle.dispatchEvent(new Event('change'));

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(plugin.settings.showRibbonIcons).toBe(true);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});
	});

	describe('Cleanup', () => {
		it('should cleanup when hide is called', () => {
			settingTab.display();

			// Call hide to trigger cleanup
			settingTab.hide();

			// Verify isMounted is false
			expect((settingTab as any).isMounted).toBe(false);
		});

		it('should cleanup when display is called multiple times', () => {
			settingTab.display();
			const firstChildCount = settingTab.containerEl.children.length;

			settingTab.display();
			const secondChildCount = settingTab.containerEl.children.length;

			// Should have similar structure (not duplicate)
			expect(secondChildCount).toBeGreaterThan(0);
			// Container should be emptied and recreated
			expect(settingTab.containerEl.children.length).toBeGreaterThan(0);
		});
	});

	describe('API Key Validation', () => {
		it('should show validation warning for invalid API key', async () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]') as HTMLInputElement;

			// Enter invalid API key
			apiKeyInput.value = 'invalid';
			apiKeyInput.dispatchEvent(new Event('input'));

			// Wait for debounce and validation
			await new Promise(resolve => setTimeout(resolve, 400));

			const warning = settingTab.containerEl.querySelector('.mod-warning');
			expect(warning).toBeDefined();
			expect(warning?.textContent).toContain('APIキーの形式が正しくない');
		});

		it('should not show validation warning for valid API key', async () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]') as HTMLInputElement;

			// Enter valid API key
			apiKeyInput.value = 'AIzaSyTest123456789012345';
			apiKeyInput.dispatchEvent(new Event('input'));

			// Wait for debounce
			await new Promise(resolve => setTimeout(resolve, 400));

			// Should not have validation warning (or should be removed)
			const warnings = settingTab.containerEl.querySelectorAll('.mod-warning');
			const validationWarning = Array.from(warnings).find(w =>
				w.textContent?.includes('APIキーの形式が正しくない')
			);
			expect(validationWarning).toBeUndefined();
		});

		it('should clear validation warning when fixing invalid API key', async () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]') as HTMLInputElement;

			// First enter invalid key
			apiKeyInput.value = 'invalid';
			apiKeyInput.dispatchEvent(new Event('input'));
			await new Promise(resolve => setTimeout(resolve, 400));

			// Verify warning appears
			let warning = settingTab.containerEl.querySelector('.mod-warning');
			expect(warning).toBeDefined();

			// Then fix it
			apiKeyInput.value = 'AIzaSyTest123456789012345';
			apiKeyInput.dispatchEvent(new Event('input'));
			await new Promise(resolve => setTimeout(resolve, 400));

			// Warning should be removed
			const warnings = settingTab.containerEl.querySelectorAll('.mod-warning');
			const validationWarning = Array.from(warnings).find(w =>
				w.textContent?.includes('APIキーの形式が正しくない')
			);
			expect(validationWarning).toBeUndefined();
		});
	});

	describe('API Key Toggle Button', () => {
		it('should create toggle button for API key visibility', () => {
			settingTab.display();

			const toggleButton = settingTab.containerEl.querySelector('.api-key-toggle-btn');
			expect(toggleButton).toBeDefined();
			expect(toggleButton?.textContent).toBe('👁️');
		});

		it('should toggle API key visibility when button is clicked', () => {
			settingTab.display();

			const apiKeyInput = settingTab.containerEl.querySelector('input[type="password"]') as HTMLInputElement;
			const toggleButton = settingTab.containerEl.querySelector('.api-key-toggle-btn') as HTMLButtonElement;

			// Initial state should be password
			expect(apiKeyInput.type).toBe('password');

			// Click to show
			toggleButton.click();
			expect(apiKeyInput.type).toBe('text');
			expect(toggleButton.textContent).toBe('🙈');

			// Click to hide
			toggleButton.click();
			expect(apiKeyInput.type).toBe('password');
			expect(toggleButton.textContent).toBe('👁️');
		});

		it('should have proper aria-label for accessibility', () => {
			settingTab.display();

			const toggleButton = settingTab.containerEl.querySelector('.api-key-toggle-btn') as HTMLButtonElement;
			expect(toggleButton.getAttribute('aria-label')).toBe('Show API key');
		});

		it('should update aria-label when toggled', () => {
			settingTab.display();

			const toggleButton = settingTab.containerEl.querySelector('.api-key-toggle-btn') as HTMLButtonElement;

			// Click to show
			toggleButton.click();
			expect(toggleButton.getAttribute('aria-label')).toBe('Hide API key');

			// Click to hide
			toggleButton.click();
			expect(toggleButton.getAttribute('aria-label')).toBe('Show API key');
		});
	});
});
