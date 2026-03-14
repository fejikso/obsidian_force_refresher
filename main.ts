import { App, FileSystemAdapter, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface RefreshSettings {
	showNotice: boolean;
	recursive: boolean;
}

const DEFAULT_SETTINGS: RefreshSettings = {
	showNotice: true,
	recursive: true
}

export default class ForceRefreshPlugin extends Plugin {
	settings: RefreshSettings;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('refresh-ccw', 'Force Refresh', (evt: MouseEvent) => {
			this.refreshFilesystem();
		});

		// Add command
		this.addCommand({
			id: 'force-refresh-filesystem',
			name: 'Force Refresh',
			callback: () => {
				this.refreshFilesystem();
			}
		});

		// Add command for full app reload (the "Nuclear" option)
		this.addCommand({
			id: 'force-reload-app',
			name: 'Force Reload App (Nuclear)',
			callback: () => {
				// @ts-ignore - Internal command
				this.app.commands.executeCommandById('app:reload');
			}
		});

		this.addSettingTab(new ForceRefreshSettingTab(this.app, this));
	}

	async refreshFilesystem() {
		console.log('Force Refresh: Starting filesystem refresh...');
		const { vault, workspace } = this.app;

		try {
			// 1. Explicitly scan the filesystem
			console.log('Force Refresh: Scanning filesystem for external modifications...');
			
			const filesToNotify: string[] = [];
			
			// Helper to scan recursively using standard adapter.list()
			const scanRecursive = async (path: string) => {
				const result = await vault.adapter.list(path);
				
				for (const filePath of result.files) {
					filesToNotify.push(filePath);
				}
				
				for (const folderPath of result.folders) {
					await scanRecursive(folderPath);
				}
			};

			await scanRecursive('');

			const diskFileSet = new Set(filesToNotify);
			const vaultFileSet = new Set(vault.getFiles().map(f => f.path));

			const newFiles = filesToNotify.filter(p => !vaultFileSet.has(p));
			const knownFiles = filesToNotify.filter(p => vaultFileSet.has(p));

			console.log(`Force Refresh: Found ${diskFileSet.size} files on disk. New to Obsidian: ${newFiles.length}, Already known: ${knownFiles.length}.`);

			// 2. Notify vault of changes — non-destructively.
			const adapter = vault.adapter as any;

			// For NEW files (on disk but not in Obsidian's index):
			// Simulate the chokidar 'add' event that the file watcher would normally fire.
			if (newFiles.length > 0) {
				if (typeof adapter.onChange === 'function') {
					console.log('Force Refresh: Notifying vault of new files via adapter.onChange...');
					for (const path of newFiles) {
						await adapter.onChange('created', path);
					}
				} else if (typeof (vault as any).reconcileFile === 'function') {
					console.log('Force Refresh: Notifying vault of new files via reconcileFile...');
					for (const path of newFiles) {
						await (vault as any).reconcileFile(path, '');
					}
				} else {
					console.warn('Force Refresh: No method found to register new files. New files may not appear until Obsidian is restarted.');
				}
			}

			// For KNOWN files (already indexed — trigger a modify event so metadata refreshes):
			for (const path of knownFiles) {
				const abstractFile = vault.getAbstractFileByPath(path);
				if (abstractFile) {
					vault.trigger('modify', abstractFile);
				}
			}

			console.log('Force Refresh: Reconciliation step complete.');

			// 3. Force file explorer and workspace to redraw
			const fileExplorerLeaves = workspace.getLeavesOfType('file-explorer');
			for (const leaf of fileExplorerLeaves) {
				if (leaf.view) {
					const view = leaf.view as any;
					if (typeof view.requestPopulate === 'function') {
						view.requestPopulate();
					} else if (typeof view.reload === 'function') {
						view.reload();
					}
				}
			}
			workspace.trigger('layout-change');


			if (this.settings.showNotice) {
				new Notice(`Filesystem refresh complete. Found ${diskFileSet.size} files (${newFiles.length} new).`);
			}
			console.log('Force Refresh: Filesystem refresh complete.');

		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error('Force Refresh: Error during filesystem refresh:', error);
			new Notice(`Error: ${msg}`);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ForceRefreshSettingTab extends PluginSettingTab {
	plugin: ForceRefreshPlugin;

	constructor(app: App, plugin: ForceRefreshPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Force Refresh' });

		new Setting(containerEl)
			.setName('Show Notice')
			.setDesc('Show a notification in the UI when the refresh is complete.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotice)
				.onChange(async (value) => {
					this.plugin.settings.showNotice = value;
					await this.plugin.saveSettings();
				}));
	}
}
