import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'test/',
				'*.config.*',
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80
			}
		},
		server: {
			deps: {
				inline: ['obsidian']
			}
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'obsidian': path.resolve(__dirname, './__mocks__/obsidian.ts')
		}
	}
});
