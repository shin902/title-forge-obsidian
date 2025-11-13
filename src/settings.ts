// Fixed Gemini model (no longer configurable)
export const GEMINI_MODEL = 'gemini-2.5-flash-lite' as const;

export interface TitleForgeSettings {
	// API Settings
	apiKey: string;

	// Title Generation Settings
	maxTitleLength: number;
	titleTemperature: number;
	titleMaxOutputTokens: number;

	// Tag Generation Settings
	tagTemperature: number;
	tagMaxOutputTokens: number;
	maxContentLength: number;

	// UI Settings
	showRibbonIcons: boolean;
	enableNotifications: boolean;
}

// Get API key from environment variable if available (for development)
// This will be replaced at build time by esbuild's define option
const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || '';

export const DEFAULT_SETTINGS: TitleForgeSettings = {
	// API Settings
	apiKey: DEFAULT_API_KEY,

	// Title Generation Settings
	maxTitleLength: 40,
	titleTemperature: 0.2,
	titleMaxOutputTokens: 64,

	// Tag Generation Settings
	tagTemperature: 0.2,
	tagMaxOutputTokens: 128,
	maxContentLength: 100,

	// UI Settings
	showRibbonIcons: false,
	enableNotifications: true
};
