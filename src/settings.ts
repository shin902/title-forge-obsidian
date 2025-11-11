export interface NoteNamerSettings {
	// API Settings
	apiKey: string;
	model: string;

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

export const DEFAULT_SETTINGS: NoteNamerSettings = {
	// API Settings
	apiKey: '',
	model: 'gemini-2.5-flash',

	// Title Generation Settings
	maxTitleLength: 40,
	titleTemperature: 0.2,
	titleMaxOutputTokens: 256,

	// Tag Generation Settings
	tagTemperature: 0.2,
	tagMaxOutputTokens: 256,
	maxContentLength: 100,

	// UI Settings
	showRibbonIcons: false,
	enableNotifications: true
};
