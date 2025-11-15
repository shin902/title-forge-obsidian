import { describe, it, expect } from 'vitest';
import { GEMINI_MODEL, DEFAULT_SETTINGS, TitleForgeSettings } from './settings';

describe('Settings', () => {
	describe('GEMINI_MODEL', () => {
		it('should be set to gemini-2.5-flash-lite', () => {
			expect(GEMINI_MODEL).toBe('gemini-2.5-flash-lite');
		});

		it('should be a constant value', () => {
			// Verify it's readonly by checking the type
			const model: typeof GEMINI_MODEL = 'gemini-2.5-flash-lite';
			expect(model).toBe(GEMINI_MODEL);
		});
	});

	describe('DEFAULT_SETTINGS', () => {
		it('should have empty API key by default', () => {
			expect(DEFAULT_SETTINGS.apiKey).toBe('');
		});

		it('should have reasonable default title generation settings', () => {
			expect(DEFAULT_SETTINGS.maxTitleLength).toBe(40);
			expect(DEFAULT_SETTINGS.titleTemperature).toBe(0.2);
			expect(DEFAULT_SETTINGS.titleMaxOutputTokens).toBe(64);
		});

		it('should have reasonable default tag generation settings', () => {
			expect(DEFAULT_SETTINGS.tagTemperature).toBe(0.2);
			expect(DEFAULT_SETTINGS.tagMaxOutputTokens).toBe(128);
			expect(DEFAULT_SETTINGS.maxContentLength).toBe(100);
		});

		it('should have UI settings configured', () => {
			expect(DEFAULT_SETTINGS.showRibbonIcons).toBe(false);
			expect(DEFAULT_SETTINGS.enableNotifications).toBe(true);
		});

		describe('Title generation settings validation', () => {
			it('should have maxTitleLength within reasonable bounds', () => {
				expect(DEFAULT_SETTINGS.maxTitleLength).toBeGreaterThan(0);
				expect(DEFAULT_SETTINGS.maxTitleLength).toBeLessThanOrEqual(100);
			});

			it('should have titleTemperature within valid range', () => {
				expect(DEFAULT_SETTINGS.titleTemperature).toBeGreaterThanOrEqual(0);
				expect(DEFAULT_SETTINGS.titleTemperature).toBeLessThanOrEqual(1);
			});

			it('should have titleMaxOutputTokens within reasonable bounds', () => {
				expect(DEFAULT_SETTINGS.titleMaxOutputTokens).toBeGreaterThan(0);
				expect(DEFAULT_SETTINGS.titleMaxOutputTokens).toBeLessThanOrEqual(1000);
			});
		});

		describe('Tag generation settings validation', () => {
			it('should have tagTemperature within valid range', () => {
				expect(DEFAULT_SETTINGS.tagTemperature).toBeGreaterThanOrEqual(0);
				expect(DEFAULT_SETTINGS.tagTemperature).toBeLessThanOrEqual(1);
			});

			it('should have tagMaxOutputTokens within reasonable bounds', () => {
				expect(DEFAULT_SETTINGS.tagMaxOutputTokens).toBeGreaterThan(0);
				expect(DEFAULT_SETTINGS.tagMaxOutputTokens).toBeLessThanOrEqual(1000);
			});

			it('should have maxContentLength within reasonable bounds', () => {
				expect(DEFAULT_SETTINGS.maxContentLength).toBeGreaterThan(0);
				expect(DEFAULT_SETTINGS.maxContentLength).toBeLessThanOrEqual(1000);
			});
		});

		describe('Settings consistency', () => {
			it('should have tag output tokens larger than title output tokens', () => {
				// Tags typically need more tokens than titles
				expect(DEFAULT_SETTINGS.tagMaxOutputTokens).toBeGreaterThan(
					DEFAULT_SETTINGS.titleMaxOutputTokens
				);
			});

			it('should use low temperature for deterministic results', () => {
				// Both should use low temperature for consistent generation
				expect(DEFAULT_SETTINGS.titleTemperature).toBeLessThanOrEqual(0.3);
				expect(DEFAULT_SETTINGS.tagTemperature).toBeLessThanOrEqual(0.3);
			});

			it('should have same temperature for both generators', () => {
				// Both should use the same temperature for consistency
				expect(DEFAULT_SETTINGS.titleTemperature).toBe(DEFAULT_SETTINGS.tagTemperature);
			});
		});
	});

	describe('TitleForgeSettings interface', () => {
		it('should accept valid settings object', () => {
			const settings: TitleForgeSettings = {
				apiKey: 'test-key',
				maxTitleLength: 50,
				titleTemperature: 0.3,
				titleMaxOutputTokens: 100,
				tagTemperature: 0.3,
				tagMaxOutputTokens: 150,
				maxContentLength: 200,
				showRibbonIcons: true,
				enableNotifications: false
			};

			expect(settings.apiKey).toBe('test-key');
			expect(settings.maxTitleLength).toBe(50);
		});

		it('should match DEFAULT_SETTINGS structure', () => {
			const settings: TitleForgeSettings = DEFAULT_SETTINGS;

			expect(settings).toHaveProperty('apiKey');
			expect(settings).toHaveProperty('maxTitleLength');
			expect(settings).toHaveProperty('titleTemperature');
			expect(settings).toHaveProperty('titleMaxOutputTokens');
			expect(settings).toHaveProperty('tagTemperature');
			expect(settings).toHaveProperty('tagMaxOutputTokens');
			expect(settings).toHaveProperty('maxContentLength');
			expect(settings).toHaveProperty('showRibbonIcons');
			expect(settings).toHaveProperty('enableNotifications');
		});
	});

	describe('Settings immutability', () => {
		it('should not share reference when using DEFAULT_SETTINGS', () => {
			const settings1 = { ...DEFAULT_SETTINGS };
			const settings2 = { ...DEFAULT_SETTINGS };

			settings1.maxTitleLength = 60;

			expect(settings2.maxTitleLength).toBe(40);
			expect(DEFAULT_SETTINGS.maxTitleLength).toBe(40);
		});
	});
});
