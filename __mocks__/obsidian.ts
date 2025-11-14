// Mock for Obsidian API
import { vi } from 'vitest';

export class Plugin {
	app: any;
	manifest: any;

	addCommand = vi.fn();
	addRibbonIcon = vi.fn();
	addSettingTab = vi.fn();
	loadData = vi.fn();
	saveData = vi.fn();

	constructor(app: any, manifest: any) {
		this.app = app;
		this.manifest = manifest;
	}
}

export class Notice {
	constructor(public message: string, public timeout?: number) {}
	hide = vi.fn();
}

export class PluginSettingTab {
	app: any;
	plugin: any;

	constructor(app: any, plugin: any) {
		this.app = app;
		this.plugin = plugin;
	}

	display() {}
	hide() {}
}

export interface TFile {
	path: string;
	basename: string;
	extension: string;
	parent: any;
}

export interface App {
	workspace: any;
	vault: any;
	fileManager: any;
}

export interface RequestUrlParam {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
	throw?: boolean;
}

export interface RequestUrlResponse {
	status: number;
	headers: Record<string, string>;
	text: string;
	json: any;
	arrayBuffer: ArrayBuffer;
}

export const requestUrl = vi.fn();

export const parseYaml = vi.fn();

export const stringifyYaml = vi.fn();

export const Setting = vi.fn();

export const setIcon = vi.fn();
