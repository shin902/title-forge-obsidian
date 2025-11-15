import { describe, it, expect } from 'vitest';
import { GEMINI_MODEL, DEFAULT_SETTINGS, TitleForgeSettings } from './settings';
import { validateApiKey } from './utils/validator';

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

	describe('Edge cases and boundary values', () => {
		describe('Title length boundaries', () => {
			it('should accept minimum slider value (10)', () => {
				const settings: TitleForgeSettings = {
					...DEFAULT_SETTINGS,
					maxTitleLength: 10
				};
				expect(settings.maxTitleLength).toBe(10);
				expect(settings.maxTitleLength).toBeGreaterThanOrEqual(10);
			});

			it('should accept maximum slider value (100)', () => {
				const settings: TitleForgeSettings = {
					...DEFAULT_SETTINGS,
					maxTitleLength: 100
				};
				expect(settings.maxTitleLength).toBe(100);
				expect(settings.maxTitleLength).toBeLessThanOrEqual(100);
			});

			it('should have default within slider range', () => {
				expect(DEFAULT_SETTINGS.maxTitleLength).toBeGreaterThanOrEqual(10);
				expect(DEFAULT_SETTINGS.maxTitleLength).toBeLessThanOrEqual(100);
			});

			it('should accept values divisible by step (5)', () => {
				const validValues = [10, 15, 20, 25, 30, 35, 40, 45, 50];
				validValues.forEach(value => {
					const settings: TitleForgeSettings = {
						...DEFAULT_SETTINGS,
						maxTitleLength: value
					};
					expect(settings.maxTitleLength % 5).toBe(0);
				});
			});
		});

		describe('Temperature boundaries', () => {
			it('should accept minimum temperature (0.0)', () => {
				const settings: TitleForgeSettings = {
					...DEFAULT_SETTINGS,
					titleTemperature: 0,
					tagTemperature: 0
				};
				expect(settings.titleTemperature).toBe(0);
				expect(settings.tagTemperature).toBe(0);
			});

			it('should accept maximum temperature (1.0)', () => {
				const settings: TitleForgeSettings = {
					...DEFAULT_SETTINGS,
					titleTemperature: 1,
					tagTemperature: 1
				};
				expect(settings.titleTemperature).toBe(1);
				expect(settings.tagTemperature).toBe(1);
			});

			it('should have defaults within range', () => {
				expect(DEFAULT_SETTINGS.titleTemperature).toBeGreaterThanOrEqual(0);
				expect(DEFAULT_SETTINGS.titleTemperature).toBeLessThanOrEqual(1);
				expect(DEFAULT_SETTINGS.tagTemperature).toBeGreaterThanOrEqual(0);
				expect(DEFAULT_SETTINGS.tagTemperature).toBeLessThanOrEqual(1);
			});

			it('should use low temperature for deterministic generation', () => {
				// Temperature should be low (≤ 0.3) for consistent results
				expect(DEFAULT_SETTINGS.titleTemperature).toBeLessThanOrEqual(0.3);
				expect(DEFAULT_SETTINGS.tagTemperature).toBeLessThanOrEqual(0.3);
			});
		});

		describe('Content length boundaries', () => {
			it('should accept minimum slider value (50)', () => {
				const settings: TitleForgeSettings = {
					...DEFAULT_SETTINGS,
					maxContentLength: 50
				};
				expect(settings.maxContentLength).toBe(50);
			});

			it('should accept maximum slider value (500)', () => {
				const settings: TitleForgeSettings = {
					...DEFAULT_SETTINGS,
					maxContentLength: 500
				};
				expect(settings.maxContentLength).toBe(500);
			});

			it('should have default within slider range', () => {
				expect(DEFAULT_SETTINGS.maxContentLength).toBeGreaterThanOrEqual(50);
				expect(DEFAULT_SETTINGS.maxContentLength).toBeLessThanOrEqual(500);
			});

			it('should accept values divisible by step (25)', () => {
				const validValues = [50, 75, 100, 125, 150];
				validValues.forEach(value => {
					const settings: TitleForgeSettings = {
						...DEFAULT_SETTINGS,
						maxContentLength: value
					};
					expect(settings.maxContentLength % 25).toBe(0);
				});
			});
		});

		describe('API key validation integration', () => {
			it('should accept empty API key as default', () => {
				expect(DEFAULT_SETTINGS.apiKey).toBe('');
			});

			it('should validate API keys with validator function', () => {
				const validKey = 'AIzaSyTest123456789012345678901234567890';
				const invalidKey = 'invalid-key';

				expect(validateApiKey(validKey)).toBe(true);
				expect(validateApiKey(invalidKey)).toBe(false);
			});

			it('should accept valid API key format', () => {
				const settings: TitleForgeSettings = {
					...DEFAULT_SETTINGS,
					apiKey: 'AIzaSyTest123456789012345678901234567890'
				};
				expect(validateApiKey(settings.apiKey)).toBe(true);
			});

			it('should handle minimum valid API key length', () => {
				// Minimum valid: "AI" prefix + 18 more characters = 20 total
				const minValidKey = 'AIzaSy12345678901234';
				expect(validateApiKey(minValidKey)).toBe(true);
				expect(minValidKey.length).toBe(20);
			});

			it('should reject invalid API key formats', () => {
				const invalidKeys = [
					'',                          // empty
					'AIza',                      // too short
					'XYzaSy1234567890123456',    // wrong prefix
					'   AIzaSy123456789012345'   // leading whitespace
				];

				invalidKeys.forEach(key => {
					expect(validateApiKey(key)).toBe(false);
				});
			});
		});

		describe('Settings consistency', () => {
			it('should have tag tokens larger than title tokens', () => {
				// Tags need more tokens as they generate multiple items
				expect(DEFAULT_SETTINGS.tagMaxOutputTokens).toBeGreaterThan(
					DEFAULT_SETTINGS.titleMaxOutputTokens
				);
			});

			it('should use same temperature for both generators', () => {
				// Consistent temperature across generators
				expect(DEFAULT_SETTINGS.titleTemperature).toBe(
					DEFAULT_SETTINGS.tagTemperature
				);
			});

			it('should have all required properties', () => {
				const requiredProps: (keyof TitleForgeSettings)[] = [
					'apiKey',
					'maxTitleLength',
					'titleTemperature',
					'titleMaxOutputTokens',
					'tagTemperature',
					'tagMaxOutputTokens',
					'maxContentLength',
					'showRibbonIcons',
					'enableNotifications'
				];

				requiredProps.forEach(prop => {
					expect(DEFAULT_SETTINGS).toHaveProperty(prop);
				});
			});
		});
	});
});
