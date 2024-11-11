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
import CanvasNode, { TCanvasData } from "components/CanvasNode";

interface FolderCanvasPluginSettings {
	nodesPerRow: number;
	openOnCreate: boolean;
	canvasFileName: string;
	watchFolder: boolean;
}

const DEFAULT_SETTINGS: FolderCanvasPluginSettings = {
	nodesPerRow: 4,
	openOnCreate: true,
	canvasFileName: `Canvas-${Date.now()}.canvas`,
	watchFolder: true,
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
		this.watchFolder(folder);

		const filename = this.settings.canvasFileName;

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

	watchFolder(folder: TFolder) {
		console.log("watch: ", this.settings.watchFolder);
		if (this.settings.watchFolder) {
			// Watch for file creation
			this.registerEvent(
				this.app.vault.on("create", async (file) => {
					if (
						file.parent?.path === folder.path &&
						file instanceof TFile &&
						file.extension === "md"
					) {
						setTimeout(
							() => this.updateCanvas(folder, "add", file),
							100
						); // add 100ms delay to ensure file is fully created
					}
				})
			);

			// Watch for file deletion
			this.registerEvent(
				this.app.vault.on("delete", async (file) => {
					if (
						file.path.includes(folder.path) &&
						file instanceof TFile &&
						file.extension === "md"
					) {
						this.updateCanvas(folder, "remove", file);
					}
				})
			);
		}
	}

	async updateCanvas(folder: TFolder, action: "add" | "remove", file: TFile) {
		const canvasFile = folder.children.find(
			(child) =>
				child instanceof TFile &&
				child.extension === "canvas" &&
				child.basename.includes(this.settings.canvasFileName)
		) as TFile;

		if (!canvasFile) return;

		const canvasData: TCanvasData = JSON.parse(
			await this.app.vault.read(canvasFile)
		);

		if (action === "add") {
			const index = (canvasFile.parent as TFolder).children.filter(
				(file: TFile) => file.extension === "md"
			).length;

			const newNode = new CanvasNode(
				index,
				this.settings.nodesPerRow,
				file.path
			);

			canvasData.nodes.push(newNode.toJSON());
		} else if (action === "remove") {
			canvasData.nodes = canvasData.nodes.filter(
				(node) => !node.file.endsWith(file.path)
			);
		}

		// Update the canvas file with modified data
		await this.app.vault.modify(
			canvasFile,
			JSON.stringify(canvasData, null, 2)
		);
		new Notice("Canvas updated.");
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
			.setName("Canvas filename pattern")
			.setDesc("Specify the default filename for a new canvas.")
			.addText((text) =>
				text
					.setPlaceholder("Canvas-<Date>.canvas")
					.setValue(this.plugin.settings.canvasFileName)
					.onChange(async (value) => {
						this.plugin.settings.canvasFileName =
							value || DEFAULT_SETTINGS.canvasFileName;
						await this.plugin.saveSettings();
					})
			);

		// Slider setting for nodes per row with dynamic description
		const nodesPerRowSetting = new Setting(containerEl)
			.setName(`Nodes per row: ${this.plugin.settings.nodesPerRow}`)
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
			.setName("Open canvas on creation")
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

		// Toggle setting for watching file changes in canvas folder
		new Setting(containerEl)
			.setName("Watch canvas folder")
			.setDesc(
				"Automatically update the canvas when files are added or removed from the folder."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.watchFolder)
					.onChange(async (value) => {
						this.plugin.settings.watchFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
