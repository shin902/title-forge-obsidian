import { TitleForgeSettings, DEFAULT_SETTINGS } from '../settings';

/**
 * Test constants to avoid magic numbers and hardcoded values
 */
export const TEST_CONSTANTS = {
	// Valid and invalid API keys for testing
	VALID_API_KEY: 'AIzaSyTEST_VALID_KEY_123456789012345',
	INVALID_API_KEY: 'invalid',
	SECRET_API_KEY: 'AIzaSySecretKey123456789',

	// Timing constants (must match implementation)
	VALIDATION_DEBOUNCE_MS: 300,
	TIMER_MARGIN_MS: 100,

	// UI Labels (Japanese)
	LABELS: {
		MAX_TITLE_LENGTH: '最大タイトル長',
		TITLE_TEMPERATURE: 'Temperature',
		TAG_TEMPERATURE: 'Temperature',
		MAX_CONTENT_LENGTH: '最大コンテンツ長',
		SHOW_RIBBON_ICONS: 'リボンアイコンを表示',
		ENABLE_NOTIFICATIONS: '通知を表示'
	},

	// Section headings
	SECTIONS: {
		API_SETTINGS: 'API設定',
		TITLE_GENERATION: 'タイトル生成設定',
		TAG_GENERATION: 'タグ生成設定',
		DISPLAY_SETTINGS: '表示設定'
	}
} as const;

/**
 * Creates a test settings object with optional overrides
 */
export function createTestSettings(
	overrides?: Partial<TitleForgeSettings>
): TitleForgeSettings {
	return {
		...DEFAULT_SETTINGS,
		...overrides
	};
}

/**
 * DOM Query Helpers - Robust element selection without index-based access
 */

/**
 * Finds a setting item by its label text
 */
export function getSettingByLabel(
	container: HTMLElement,
	labelText: string
): HTMLElement | null {
	const settingItems = container.querySelectorAll('.setting-item');
	for (const item of settingItems) {
		const nameEl = item.querySelector('.setting-item-name');
		if (nameEl?.textContent === labelText) {
			return item as HTMLElement;
		}
	}
	return null;
}

/**
 * Finds a slider input by its setting label
 */
export function getSliderByLabel(
	container: HTMLElement,
	labelText: string
): HTMLInputElement | null {
	const setting = getSettingByLabel(container, labelText);
	if (!setting) return null;

	return setting.querySelector('input[type="range"]') as HTMLInputElement;
}

/**
 * Finds a toggle input by its setting label
 */
export function getToggleByLabel(
	container: HTMLElement,
	labelText: string
): HTMLInputElement | null {
	const setting = getSettingByLabel(container, labelText);
	if (!setting) return null;

	return setting.querySelector('input[type="checkbox"]') as HTMLInputElement;
}

/**
 * Finds a section by its heading text
 */
export function getSectionByHeading(
	container: HTMLElement,
	headingText: string
): HTMLElement | null {
	const headings = container.querySelectorAll('h2');
	for (const heading of headings) {
		if (heading.textContent === headingText) {
			return heading as HTMLElement;
		}
	}
	return null;
}

/**
 * Gets the API key input element
 */
export function getApiKeyInput(container: HTMLElement): HTMLInputElement | null {
	return container.querySelector('input[type="password"]') as HTMLInputElement;
}

/**
 * Gets the API key toggle button
 */
export function getApiKeyToggleButton(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector('.api-key-toggle-btn') as HTMLButtonElement;
}

/**
 * Gets validation warning messages
 */
export function getValidationWarnings(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('.mod-warning'));
}

/**
 * Gets a specific validation warning by text content
 */
export function getValidationWarningByText(
	container: HTMLElement,
	searchText: string
): HTMLElement | null {
	const warnings = getValidationWarnings(container);
	return warnings.find(w => w.textContent?.includes(searchText)) || null;
}
