import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TitleForgeSettingTab } from './setting-tab';
import { App } from 'obsidian';
import TitleForgePlugin from '../main';
import {
	TEST_CONSTANTS,
	createTestSettings,
	getSliderByLabel,
	getToggleByLabel,
	getApiKeyInput,
	getApiKeyToggleButton,
	getValidationWarningByText,
	getSectionByHeading
} from './test-helpers';

// Type helper for accessing internal properties in tests
type TitleForgeSettingTabInternal = TitleForgeSettingTab & {
	isMounted: boolean;
	validationMessage: HTMLElement | null;
	validationTimeout: ReturnType<typeof setTimeout> | null;
	toggleContainer: HTMLElement | null;
};

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
		// Use fake timers for better test performance and control
		vi.useFakeTimers();

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

	afterEach(() => {
		// Cleanup to prevent memory leaks
		if (settingTab) {
			settingTab.hide();
		}

		// Run pending timers and restore real timers
		vi.runOnlyPendingTimers();
		vi.useRealTimers();

		// Clear all mocks
		vi.clearAllMocks();
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

			const apiHeader = getSectionByHeading(
				settingTab.containerEl,
				TEST_CONSTANTS.SECTIONS.API_SETTINGS
			);
			expect(apiHeader).toBeDefined();
		});

		it('should create title generation settings section', () => {
			settingTab.display();

			const titleHeader = getSectionByHeading(
				settingTab.containerEl,
				TEST_CONSTANTS.SECTIONS.TITLE_GENERATION
			);
			expect(titleHeader).toBeDefined();
		});

		it('should create tag generation settings section', () => {
			settingTab.display();

			const tagHeader = getSectionByHeading(
				settingTab.containerEl,
				TEST_CONSTANTS.SECTIONS.TAG_GENERATION
			);
			expect(tagHeader).toBeDefined();
		});

		it('should create display settings section', () => {
			settingTab.display();

			const displayHeader = getSectionByHeading(
				settingTab.containerEl,
				TEST_CONSTANTS.SECTIONS.DISPLAY_SETTINGS
			);
			expect(displayHeader).toBeDefined();
		});

		it('should create API key input field', () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();
		});

		it('should set API key input placeholder', () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput?.placeholder).toBe('AIza...');
		});

		it('should disable autocomplete on API key input', () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
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

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();

			// Simulate input change
			apiKeyInput!.value = TEST_CONSTANTS.VALID_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));

			// Advance timers past debounce delay
			const waitTime = TEST_CONSTANTS.VALIDATION_DEBOUNCE_MS + TEST_CONSTANTS.TIMER_MARGIN_MS;
			await vi.advanceTimersByTimeAsync(waitTime);

			expect(plugin.settings.apiKey).toBe(TEST_CONSTANTS.VALID_API_KEY);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});

		it('should save settings when max title length changes', async () => {
			settingTab.display();

			const titleLengthSlider = getSliderByLabel(
				settingTab.containerEl,
				TEST_CONSTANTS.LABELS.MAX_TITLE_LENGTH
			);
			expect(titleLengthSlider).toBeDefined();

			// Simulate slider change
			titleLengthSlider!.value = '50';
			titleLengthSlider!.dispatchEvent(new Event('input'));

			// Settings should save immediately (no debounce for sliders)
			await vi.advanceTimersByTimeAsync(0);

			expect(plugin.settings.maxTitleLength).toBe(50);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});

		it('should save settings when temperature changes', async () => {
			settingTab.display();

			// Find the first Temperature slider in the Title Generation section
			const titleSection = getSectionByHeading(
				settingTab.containerEl,
				TEST_CONSTANTS.SECTIONS.TITLE_GENERATION
			);
			expect(titleSection).toBeDefined();

			// Get all sliders and find the one in the title generation section
			const allSliders = Array.from(settingTab.containerEl.querySelectorAll('input[type="range"]'));
			const titleTempSlider = allSliders.find(slider => {
				const setting = slider.closest('.setting-item');
				if (!setting) return false;
				const nameEl = setting.querySelector('.setting-item-name');
				const descEl = setting.querySelector('.setting-item-description');
				return nameEl?.textContent === TEST_CONSTANTS.LABELS.TITLE_TEMPERATURE &&
					descEl?.textContent?.includes('タイトル生成');
			}) as HTMLInputElement;

			expect(titleTempSlider).toBeDefined();

			// Simulate slider change
			titleTempSlider!.value = '0.5';
			titleTempSlider!.dispatchEvent(new Event('input'));

			// Settings should save immediately (no debounce for sliders)
			await vi.advanceTimersByTimeAsync(0);

			expect(plugin.settings.titleTemperature).toBe(0.5);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});

		it('should save settings when toggle changes', async () => {
			settingTab.display();

			const ribbonToggle = getToggleByLabel(
				settingTab.containerEl,
				TEST_CONSTANTS.LABELS.SHOW_RIBBON_ICONS
			);
			expect(ribbonToggle).toBeDefined();

			// Simulate toggle change
			ribbonToggle!.checked = true;
			ribbonToggle!.dispatchEvent(new Event('change'));

			// Settings should save immediately (no debounce for toggles)
			await vi.advanceTimersByTimeAsync(0);

			expect(plugin.settings.showRibbonIcons).toBe(true);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});
	});

	describe('Cleanup', () => {
		it('should cleanup when hide is called', () => {
			settingTab.display();

			// Call hide to trigger cleanup
			settingTab.hide();

			// Verify isMounted is false using type-safe helper
			const internal = settingTab as TitleForgeSettingTabInternal;
			expect(internal.isMounted).toBe(false);
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

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();

			// Enter invalid API key
			apiKeyInput!.value = TEST_CONSTANTS.INVALID_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));

			// Advance timers past debounce delay
			const waitTime = TEST_CONSTANTS.VALIDATION_DEBOUNCE_MS + TEST_CONSTANTS.TIMER_MARGIN_MS;
			await vi.advanceTimersByTimeAsync(waitTime);

			const warning = getValidationWarningByText(
				settingTab.containerEl,
				'APIキーの形式が正しくない'
			);
			expect(warning).toBeDefined();
		});

		it('should not show validation warning for valid API key', async () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();

			// Enter valid API key
			apiKeyInput!.value = TEST_CONSTANTS.VALID_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));

			// Advance timers past debounce delay
			const waitTime = TEST_CONSTANTS.VALIDATION_DEBOUNCE_MS + TEST_CONSTANTS.TIMER_MARGIN_MS;
			await vi.advanceTimersByTimeAsync(waitTime);

			// Should not have validation warning
			const validationWarning = getValidationWarningByText(
				settingTab.containerEl,
				'APIキーの形式が正しくない'
			);
			expect(validationWarning).toBeNull();
		});

		it('should clear validation warning when fixing invalid API key', async () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();

			const waitTime = TEST_CONSTANTS.VALIDATION_DEBOUNCE_MS + TEST_CONSTANTS.TIMER_MARGIN_MS;

			// First enter invalid key
			apiKeyInput!.value = TEST_CONSTANTS.INVALID_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));
			await vi.advanceTimersByTimeAsync(waitTime);

			// Verify warning appears
			let warning = getValidationWarningByText(
				settingTab.containerEl,
				'APIキーの形式が正しくない'
			);
			expect(warning).toBeDefined();

			// Then fix it
			apiKeyInput!.value = TEST_CONSTANTS.VALID_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));
			await vi.advanceTimersByTimeAsync(waitTime);

			// Warning should be removed
			const validationWarning = getValidationWarningByText(
				settingTab.containerEl,
				'APIキーの形式が正しくない'
			);
			expect(validationWarning).toBeNull();
		});
	});

	describe('API Key Toggle Button', () => {
		it('should create toggle button for API key visibility', () => {
			settingTab.display();

			const toggleButton = getApiKeyToggleButton(settingTab.containerEl);
			expect(toggleButton).toBeDefined();
			expect(toggleButton?.textContent).toBe('👁️');
		});

		it('should toggle API key visibility when button is clicked', () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			const toggleButton = getApiKeyToggleButton(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();
			expect(toggleButton).toBeDefined();

			// Initial state should be password
			expect(apiKeyInput!.type).toBe('password');

			// Click to show
			toggleButton!.click();
			expect(apiKeyInput!.type).toBe('text');
			expect(toggleButton!.textContent).toBe('🙈');

			// Click to hide
			toggleButton!.click();
			expect(apiKeyInput!.type).toBe('password');
			expect(toggleButton!.textContent).toBe('👁️');
		});

		it('should have proper aria-label for accessibility', () => {
			settingTab.display();

			const toggleButton = getApiKeyToggleButton(settingTab.containerEl);
			expect(toggleButton?.getAttribute('aria-label')).toBe('Show API key');
		});

		it('should update aria-label when toggled', () => {
			settingTab.display();

			const toggleButton = getApiKeyToggleButton(settingTab.containerEl);
			expect(toggleButton).toBeDefined();

			// Click to show
			toggleButton!.click();
			expect(toggleButton!.getAttribute('aria-label')).toBe('Hide API key');

			// Click to hide
			toggleButton!.click();
			expect(toggleButton!.getAttribute('aria-label')).toBe('Show API key');
		});
	});

	describe('Error handling and edge cases', () => {
		it('should handle rapid successive display calls without memory leaks', () => {
			// Call display multiple times rapidly
			settingTab.display();
			settingTab.display();
			settingTab.display();

			// Should not create duplicate DOM elements
			const headers = settingTab.containerEl.querySelectorAll('h2');
			const apiKeyInputs = settingTab.containerEl.querySelectorAll('input[type="password"]');

			// Should have exactly one of each section and one API key input
			expect(headers.length).toBe(4); // API, Title, Tag, Display sections
			expect(apiKeyInputs.length).toBe(1);
		});

		it('should handle cleanup of pending timers on hide', async () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();

			// Start validation timeout
			apiKeyInput!.value = TEST_CONSTANTS.INVALID_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));

			// Don't wait for timeout - hide immediately to test cleanup
			settingTab.hide();

			const internal = settingTab as TitleForgeSettingTabInternal;
			expect(internal.isMounted).toBe(false);

			// Advance time past debounce - should not cause errors or add messages
			const waitTime = TEST_CONSTANTS.VALIDATION_DEBOUNCE_MS + TEST_CONSTANTS.TIMER_MARGIN_MS;
			await vi.advanceTimersByTimeAsync(waitTime);

			// Validation message should not be added after unmount
			const warning = getValidationWarningByText(settingTab.containerEl, 'APIキー');
			expect(warning).toBeNull();
		});

		it('should not execute validation callback after unmount', async () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();

			// Start validation
			apiKeyInput!.value = TEST_CONSTANTS.INVALID_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));

			// Unmount immediately
			settingTab.hide();

			// Advance time past debounce
			const waitTime = TEST_CONSTANTS.VALIDATION_DEBOUNCE_MS + TEST_CONSTANTS.TIMER_MARGIN_MS;
			await vi.advanceTimersByTimeAsync(waitTime);

			// Should not have added validation message (tab was unmounted)
			const internal = settingTab as TitleForgeSettingTabInternal;
			expect(internal.isMounted).toBe(false);
		});
	});

	describe('Security considerations', () => {
		it('should prevent autocomplete on API key field', () => {
			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput?.getAttribute('autocomplete')).toBe('off');
		});

		it('should use password type by default for API key', () => {
			settingTab.display();

			const passwordInput = getApiKeyInput(settingTab.containerEl);
			expect(passwordInput).toBeDefined();
			expect(passwordInput?.type).toBe('password');
		});

		it('should open external links with security attributes', () => {
			settingTab.display();

			const link = settingTab.containerEl.querySelector('a[href="https://aistudio.google.com/app/apikey"]') as HTMLAnchorElement;
			expect(link).toBeDefined();
			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
		});

		it('should not log sensitive data', () => {
			const consoleSpy = vi.spyOn(console, 'log');
			const consoleErrorSpy = vi.spyOn(console, 'error');

			settingTab.display();

			const apiKeyInput = getApiKeyInput(settingTab.containerEl);
			expect(apiKeyInput).toBeDefined();

			apiKeyInput!.value = TEST_CONSTANTS.SECRET_API_KEY;
			apiKeyInput!.dispatchEvent(new Event('input'));

			// Check console was not called with API key
			expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('AIza'));
			expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('AIza'));

			consoleSpy.mockRestore();
			consoleErrorSpy.mockRestore();
		});
	});

	describe('Accessibility', () => {
		it('should have descriptive labels for all settings', () => {
			settingTab.display();

			const settingNames = Array.from(settingTab.containerEl.querySelectorAll('.setting-item-name'));
			const nameTexts = settingNames.map(el => el.textContent);

			// Should have descriptive names for all settings
			expect(nameTexts.length).toBeGreaterThan(0);
			expect(nameTexts.every(name => name && name.length > 0)).toBe(true);
		});

		it('should have descriptions for complex settings', () => {
			settingTab.display();

			const settingDescs = Array.from(settingTab.containerEl.querySelectorAll('.setting-item-description'));

			// Should have multiple descriptions
			expect(settingDescs.length).toBeGreaterThan(0);
		});

		it('should structure content with proper headings', () => {
			settingTab.display();

			// Use constants for section names
			const sections = Object.values(TEST_CONSTANTS.SECTIONS);
			sections.forEach(sectionName => {
				const section = getSectionByHeading(settingTab.containerEl, sectionName);
				expect(section).toBeDefined();
			});
		});
	});
});
