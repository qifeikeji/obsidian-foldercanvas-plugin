import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
} from "obsidian";
import { createCanvasWithNodes } from "./components/CanvasGenerator";
import { FolderSuggestModal } from "./components/FolderSuggestModal";

interface FolderCanvasPluginSettings {
	nodesPerRow: number;
	openOnCreate: boolean;
	canvasFileName: string;
	defaultFolderPath: string;
}

const DEFAULT_SETTINGS: FolderCanvasPluginSettings = {
	nodesPerRow: 4,
	openOnCreate: true,
	canvasFileName: `Canvas-${Date.now()}.canvas`,
	defaultFolderPath: "test",
};

const COMMAND_ID = "foldercanvas:generate-canvas-from-folder";

export default class FolderCanvasPlugin extends Plugin {
	settings: FolderCanvasPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("palette", "Folder Canvas", (evt: MouseEvent) =>
			this.triggerCommandById()
		);

		this.addSettingTab(new FolderCanvasSettingTab(this.app, this));

		this.addCommand({
			id: "generate-canvas-from-folder",
			name: "Generate Canvas from Folder",
			callback: async () => {
				new FolderSuggestModal(this.app, async (folder) => {
					try {
						await this.generateCanvas(folder);
					} catch (error) {
						new Notice(
							"Failed to generate canvas. Please try again."
						);
						console.error(error);
					}
				}).open();
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item.setTitle("Generate a Canvas view")
						.setIcon("palette")
						.onClick(async () => this.triggerCommandById());
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item.setTitle("Generate a Canvas view")
						.setIcon("palette")
						.onClick(async () => this.triggerCommandById());
				});
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async generateCanvas(folder: TFolder) {
		const filename =
			this.settings.canvasFileName || DEFAULT_SETTINGS.canvasFileName;

		const files = folder.children.filter(
			(file) => file instanceof TFile && file.extension === "md"
		) as TFile[];
		await createCanvasWithNodes(
			this.app,
			folder.path,
			files,
			this.settings.nodesPerRow,
			this.settings.openOnCreate,
			filename
		);
	}

	async triggerCommandById() {
		(this.app as any).commands.executeCommandById(COMMAND_ID);
	}
}

class FolderCanvasSettingTab extends PluginSettingTab {
	plugin: FolderCanvasPlugin;

	constructor(app: App, plugin: FolderCanvasPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Folder Canvas Settings" });

		new Setting(containerEl)
			.setName("Canvas Filename Pattern")
			.setDesc("Specify the default filename for a new canvas.")
			.addText((text) =>
				text
					.setPlaceholder("Canvas-<Date>.canvas")
					.setValue(this.plugin.settings.canvasFileName)
					.onChange(async (value) => {
						this.plugin.settings.canvasFileName =
							value ?? this.plugin.settings.canvasFileName;
						await this.plugin.saveSettings();
					})
			);

		// Slider setting for nodes per row with dynamic description
		const nodesPerRowSetting = new Setting(containerEl)
			.setName(`Nodes Per Row: ${this.plugin.settings.nodesPerRow}`)
			.setDesc("Number of nodes to display per row in the canvas.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 10, 1)
					.setValue(this.plugin.settings.nodesPerRow)
					.onChange(async (value) => {
						this.plugin.settings.nodesPerRow = value;
						await this.plugin.saveSettings();
						nodesPerRowSetting.setName(`Nodes Per Row: ${value}`);
					})
			);

		// Toggle setting for opening canvas on creation
		new Setting(containerEl)
			.setName("Open Canvas on Creation")
			.setDesc(
				"Automatically open the new canvas file after it is created."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openOnCreate)
					.onChange(async (value) => {
						this.plugin.settings.openOnCreate = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
