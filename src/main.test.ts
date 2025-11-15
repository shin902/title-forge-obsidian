import { describe, it, expect, vi, beforeEach } from 'vitest';
import TitleForgePlugin from './main';
import { TitleGenerator } from './services/title-generator';
import { TagGenerator } from './services/tag-generator';
import { validateApiKey, validateContent, arraysEqual } from './utils/validator';

// Mock dependencies
const { mockTitleGeneratorInstance, mockTagGeneratorInstance, TitleGeneratorMock, TagGeneratorMock } = vi.hoisted(() => {
	const mockTitleGeneratorInstance = {
		generateTitle: vi.fn()
	};
	const mockTagGeneratorInstance = {
		generateTags: vi.fn()
	};

	const TitleGeneratorMock = vi.fn(function() {
		return mockTitleGeneratorInstance;
	});

	const TagGeneratorMock = vi.fn(function() {
		return mockTagGeneratorInstance;
	});

	return { mockTitleGeneratorInstance, mockTagGeneratorInstance, TitleGeneratorMock, TagGeneratorMock };
});

vi.mock('obsidian', () => ({
	Plugin: class MockPlugin {
		app: any;
		addCommand = vi.fn();
		addRibbonIcon = vi.fn();
		addSettingTab = vi.fn();
		loadData = vi.fn();
		saveData = vi.fn();
	},
	Notice: vi.fn(function(message, timeout) {
		return { hide: vi.fn(), message, timeout };
	}),
	parseYaml: vi.fn(),
	stringifyYaml: vi.fn()
}));

vi.mock('./services/title-generator', () => ({
	TitleGenerator: TitleGeneratorMock
}));
vi.mock('./services/tag-generator', () => ({
	TagGenerator: TagGeneratorMock
}));
vi.mock('./utils/validator');
vi.mock('./ui/setting-tab', () => ({
	TitleForgeSettingTab: vi.fn()
}));

import { Notice, parseYaml, stringifyYaml } from 'obsidian';

describe('TitleForgePlugin', () => {
	let plugin: TitleForgePlugin;
	let mockApp: any;
	let mockFile: any;
	let mockTitleGenerator: any;
	let mockTagGenerator: any;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Create mock app
		mockApp = {
			workspace: {
				getActiveFile: vi.fn()
			},
			vault: {
				read: vi.fn(),
				modify: vi.fn()
			},
			fileManager: {
				renameFile: vi.fn()
			}
		};

		// Create mock file
		mockFile = {
			basename: 'Test Note',
			path: 'Test Note.md',
			parent: {
				path: 'folder'
			}
		};

		// Clear mock call history but keep the same functions
		mockTitleGeneratorInstance.generateTitle.mockClear();
		mockTagGeneratorInstance.generateTags.mockClear();

		// Assign to local variables for easy access in tests
		mockTitleGenerator = mockTitleGeneratorInstance;
		mockTagGenerator = mockTagGeneratorInstance;

		// Mock validators
		vi.mocked(validateApiKey).mockReturnValue(true);
		vi.mocked(validateContent).mockReturnValue(true);
		vi.mocked(arraysEqual).mockReturnValue(false);

		// Create plugin instance
		plugin = new TitleForgePlugin(mockApp, {} as any);
		plugin.app = mockApp;
	});

	describe('onload', () => {
		it('should initialize services', async () => {
			plugin.loadData = vi.fn().mockResolvedValue({});

			await plugin.onload();

			expect(TitleGenerator).toHaveBeenCalledTimes(1);
			expect(TagGenerator).toHaveBeenCalledTimes(1);
		});

		it('should register commands', async () => {
			plugin.loadData = vi.fn().mockResolvedValue({});
			const addCommandSpy = vi.spyOn(plugin, 'addCommand');

			await plugin.onload();

			expect(addCommandSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'title-forge-generate-title',
					name: 'Generate title with AI'
				})
			);

			expect(addCommandSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'title-forge-generate-tags',
					name: 'Generate tags with AI'
				})
			);
		});

		it('should load settings', async () => {
			const savedSettings = { apiKey: 'test-key' };
			plugin.loadData = vi.fn().mockResolvedValue(savedSettings);

			await plugin.onload();

			expect(plugin.settings.apiKey).toBe('test-key');
		});

		it('should add ribbon icons when enabled', async () => {
			plugin.loadData = vi.fn().mockResolvedValue({ showRibbonIcons: true });
			const addRibbonIconSpy = vi.spyOn(plugin, 'addRibbonIcon');

			await plugin.onload();

			expect(addRibbonIconSpy).toHaveBeenCalledTimes(2);
		});

		it('should not add ribbon icons when disabled', async () => {
			plugin.loadData = vi.fn().mockResolvedValue({ showRibbonIcons: false });
			const addRibbonIconSpy = vi.spyOn(plugin, 'addRibbonIcon');

			await plugin.onload();

			expect(addRibbonIconSpy).not.toHaveBeenCalled();
		});
	});

	describe('onunload', () => {
		it('should remove ribbon icons', () => {
			const mockTitleIcon = { remove: vi.fn() };
			const mockTagIcon = { remove: vi.fn() };

			(plugin as any).ribbonIconTitle = mockTitleIcon;
			(plugin as any).ribbonIconTag = mockTagIcon;

			plugin.onunload();

			expect(mockTitleIcon.remove).toHaveBeenCalled();
			expect(mockTagIcon.remove).toHaveBeenCalled();
		});
	});

	describe('loadSettings', () => {
		it('should merge saved settings with defaults', async () => {
			const savedSettings = { apiKey: 'saved-key', maxTitleLength: 50 };
			plugin.loadData = vi.fn().mockResolvedValue(savedSettings);

			await plugin.loadSettings();

			expect(plugin.settings.apiKey).toBe('saved-key');
			expect(plugin.settings.maxTitleLength).toBe(50);
		});

		it('should use defaults when no saved settings', async () => {
			plugin.loadData = vi.fn().mockResolvedValue({});

			await plugin.loadSettings();

			expect(plugin.settings.apiKey).toBe('');
			expect(plugin.settings.maxTitleLength).toBe(40);
		});
	});

	describe('saveSettings', () => {
		it('should save settings data', async () => {
			plugin.saveData = vi.fn().mockResolvedValue(undefined);
			plugin.settings = { apiKey: 'test-key' } as any;

			await plugin.saveSettings();

			expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
		});
	});

	describe('generateTitle', () => {
		beforeEach(() => {
			plugin.settings = {
				apiKey: 'AIzaSyD-test_1234567890',
				enableNotifications: true
			} as any;
			// Initialize generators for tests that need them
			(plugin as any).titleGenerator = mockTitleGenerator;
			(plugin as any).tagGenerator = mockTagGenerator;
		});

		it('should show error when API key is invalid', async () => {
			vi.mocked(validateApiKey).mockReturnValue(false);

			await (plugin as any).generateTitle();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('GEMINI_API_KEY が未設定または不正です'),
				5000
			);
		});

		it('should show error when no active file', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(null);

			await (plugin as any).generateTitle();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('アクティブなファイルがありません'),
				5000
			);
		});

		it('should show error when content is empty', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('');
			vi.mocked(validateContent).mockReturnValue(false);

			await (plugin as any).generateTitle();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('本文が空です'),
				5000
			);
		});

		it('should generate and apply new title', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTitleGenerator.generateTitle.mockResolvedValue('New Title');

			await (plugin as any).generateTitle();

			expect(mockTitleGenerator.generateTitle).toHaveBeenCalledWith(
				'Test content',
				plugin.settings
			);
			expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
				mockFile,
				'folder/New Title.md'
			);
		});

		it('should handle file in root folder', async () => {
			const rootFile = { ...mockFile, parent: null };
			mockApp.workspace.getActiveFile.mockReturnValue(rootFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTitleGenerator.generateTitle.mockResolvedValue('New Title');

			await (plugin as any).generateTitle();

			expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
				rootFile,
				'New Title.md'
			);
		});

		it('should skip rename when title is unchanged (idempotency)', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTitleGenerator.generateTitle.mockResolvedValue('Test Note');

			await (plugin as any).generateTitle();

			expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('タイトルは既に最新です')
			);
		});

		it('should show success notification', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTitleGenerator.generateTitle.mockResolvedValue('New Title');

			await (plugin as any).generateTitle();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('Test Note → New Title')
			);
		});

		it('should handle generation errors', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTitleGenerator.generateTitle.mockRejectedValue(new Error('API error'));

			await (plugin as any).generateTitle();

			expect(Notice).toHaveBeenCalledWith('API error', 5000);
		});

		it('should not show notification when disabled', async () => {
			plugin.settings.enableNotifications = false;
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTitleGenerator.generateTitle.mockResolvedValue('Test Note');

			await (plugin as any).generateTitle();

			// Only error notices should be shown, not success notifications
			const successNotices = vi.mocked(Notice).mock.calls.filter(
				call => call.length === 1 // Success notices have only 1 argument
			);
			expect(successNotices.length).toBe(0);
		});
	});

	describe('generateTags', () => {
		beforeEach(() => {
			plugin.settings = {
				apiKey: 'AIzaSyD-test_1234567890',
				enableNotifications: true
			} as any;
			// Initialize generators for tests that need them
			(plugin as any).titleGenerator = mockTitleGenerator;
			(plugin as any).tagGenerator = mockTagGenerator;
		});

		it('should show error when API key is invalid', async () => {
			vi.mocked(validateApiKey).mockReturnValue(false);

			await (plugin as any).generateTags();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('GEMINI_API_KEY が未設定または不正です'),
				5000
			);
		});

		it('should show error when no active file', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(null);

			await (plugin as any).generateTags();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('アクティブなファイルがありません'),
				5000
			);
		});

		it('should show error when content is empty', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('');
			vi.mocked(validateContent).mockReturnValue(false);

			await (plugin as any).generateTags();

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('本文が空です'),
				5000
			);
		});

		it('should generate and apply new tags', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTagGenerator.generateTags.mockResolvedValue(['tag1', 'tag2']);

			await (plugin as any).generateTags();

			expect(mockTagGenerator.generateTags).toHaveBeenCalledWith(
				'Test content',
				plugin.settings
			);
		});

		it('should skip update when tags are unchanged (idempotency)', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTagGenerator.generateTags.mockResolvedValue(['tag1', 'tag2']);
			vi.mocked(arraysEqual).mockReturnValue(true);

			await (plugin as any).generateTags();

			expect(mockApp.vault.modify).not.toHaveBeenCalled();
			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('タグは既に最新です')
			);
		});

		it('should handle generation errors', async () => {
			mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
			mockApp.vault.read.mockResolvedValue('Test content');
			mockTagGenerator.generateTags.mockRejectedValue(new Error('API error'));

			await (plugin as any).generateTags();

			expect(Notice).toHaveBeenCalledWith('API error', 5000);
		});
	});

	describe('getTagsFromFrontmatter', () => {
		it('should extract tags from frontmatter array', async () => {
			const content = `---
title: Test
tags: [tag1, tag2, tag3]
---
Content`;
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(parseYaml).mockReturnValue({
				title: 'Test',
				tags: ['tag1', 'tag2', 'tag3']
			});

			const tags = await (plugin as any).getTagsFromFrontmatter(mockFile);

			expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
		});

		it('should extract single tag from frontmatter string', async () => {
			const content = `---
title: Test
tags: single-tag
---
Content`;
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(parseYaml).mockReturnValue({
				title: 'Test',
				tags: 'single-tag'
			});

			const tags = await (plugin as any).getTagsFromFrontmatter(mockFile);

			expect(tags).toEqual(['single-tag']);
		});

		it('should return empty array when no frontmatter', async () => {
			const content = 'Content without frontmatter';
			mockApp.vault.read.mockResolvedValue(content);

			const tags = await (plugin as any).getTagsFromFrontmatter(mockFile);

			expect(tags).toEqual([]);
		});

		it('should return empty array when no tags in frontmatter', async () => {
			const content = `---
title: Test
---
Content`;
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(parseYaml).mockReturnValue({
				title: 'Test'
			});

			const tags = await (plugin as any).getTagsFromFrontmatter(mockFile);

			expect(tags).toEqual([]);
		});

		it('should handle YAML parsing errors', async () => {
			const content = `---
invalid: yaml: content:
---
Content`;
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(parseYaml).mockImplementation(() => {
				throw new Error('Invalid YAML');
			});

			const tags = await (plugin as any).getTagsFromFrontmatter(mockFile);

			expect(tags).toEqual([]);
		});
	});

	describe('updateTagsInFrontmatter', () => {
		it('should update existing frontmatter with tags', async () => {
			const content = `---
title: Test
tags: [old-tag]
---
Content`;
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(parseYaml).mockReturnValue({
				title: 'Test',
				tags: ['old-tag']
			});
			vi.mocked(stringifyYaml).mockReturnValue('title: Test\ntags:\n  - new-tag1\n  - new-tag2');

			await (plugin as any).updateTagsInFrontmatter(mockFile, ['new-tag1', 'new-tag2']);

			expect(mockApp.vault.modify).toHaveBeenCalledWith(
				mockFile,
				expect.stringContaining('new-tag1')
			);
		});

		it('should add frontmatter when none exists', async () => {
			const content = 'Content without frontmatter';
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(stringifyYaml).mockReturnValue('tags:\n  - tag1\n  - tag2');

			await (plugin as any).updateTagsInFrontmatter(mockFile, ['tag1', 'tag2']);

			expect(mockApp.vault.modify).toHaveBeenCalledWith(
				mockFile,
				expect.stringContaining('---\ntags:')
			);
		});

		it('should handle YAML parsing errors by creating new frontmatter', async () => {
			const content = `---
invalid: yaml: content:
---
Old content`;
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(parseYaml).mockImplementation(() => {
				throw new Error('Invalid YAML');
			});
			vi.mocked(stringifyYaml).mockReturnValue('tags:\n  - tag1');

			await (plugin as any).updateTagsInFrontmatter(mockFile, ['tag1']);

			expect(mockApp.vault.modify).toHaveBeenCalled();
		});

		it('should preserve existing frontmatter fields', async () => {
			const content = `---
title: Test
author: John
tags: [old-tag]
---
Content`;
			mockApp.vault.read.mockResolvedValue(content);
			vi.mocked(parseYaml).mockReturnValue({
				title: 'Test',
				author: 'John',
				tags: ['old-tag']
			});

			await (plugin as any).updateTagsInFrontmatter(mockFile, ['new-tag']);

			const parseCall = vi.mocked(parseYaml).mock.calls[0][0];
			expect(parseCall).toContain('title: Test');
			expect(parseCall).toContain('author: John');
		});
	});

	describe('showNotification', () => {
		it('should show notice when notifications enabled', () => {
			plugin.settings = { enableNotifications: true } as any;

			(plugin as any).showNotification('Test message');

			expect(Notice).toHaveBeenCalledWith('Test message');
		});

		it('should not show notice when notifications disabled', () => {
			plugin.settings = { enableNotifications: false } as any;
			vi.clearAllMocks();

			(plugin as any).showNotification('Test message');

			expect(Notice).not.toHaveBeenCalled();
		});
	});

	describe('showError', () => {
		it('should always show error notices', () => {
			(plugin as any).showError('Error message');

			expect(Notice).toHaveBeenCalledWith('Error message', 5000);
		});
	});
});
