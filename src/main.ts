import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
} from "obsidian";
import CanvasNode, {
	TCanvasData,
	TCanvasNode,
} from "src/components/CanvasNode";
import {
	createCanvasWithNodes,
	getCanvasFilesInFolder,
} from "./components/CanvasGenerator";
import { FolderSuggestModal } from "./components/FolderSuggestModal";
import { normalizeFileName } from "./utils";

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

const PLUGIN_NAME = "foldercanvas";
const COMMMAND_ID = "generate-canvas-from-folder";
const COMMAND_NAME = "Generate Canvas from folder";
const COMMAND_FULL_ID = `${PLUGIN_NAME}:${COMMMAND_ID}`;

export default class FolderCanvasPlugin extends Plugin {
	settings: FolderCanvasPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("palette", "Folder Canvas", (evt: MouseEvent) =>
			this.triggerCommandById()
		);

		this.addSettingTab(new FolderCanvasSettingTab(this.app, this));

		this.addCommand({
			id: COMMMAND_ID,
			name: COMMAND_NAME,
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

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("create", async (file) => {
					if (file instanceof TFile && file.extension === "md") {
						setTimeout(() => this.updateCanvas("add", file), 100); // add 100ms delay to ensure file is fully created
					}
				})
			);

			this.registerEvent(
				this.app.vault.on("delete", async (file) => {
					if (file instanceof TFile && file.extension === "md") {
						this.updateCanvas("remove", file);
					}
				})
			);

			this.registerEvent(
				this.app.vault.on("rename", async (file, oldPath) => {
					if (file instanceof TFile && file.extension === "md") {
						setTimeout(
							() => this.updateCanvas("rename", file, oldPath),
							100
						);
					}
				})
			);
		});
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
		const filename = this.settings.canvasFileName;

		const files = folder.children.filter(
			(file): file is TFile =>
				file instanceof TFile && file.extension === "md"
		);

		await createCanvasWithNodes(
			this.app,
			folder.path,
			files,
			this.settings.nodesPerRow,
			this.settings.openOnCreate,
			filename
		);
	}

	async updateCanvas(
		action: "add" | "remove" | "rename",
		file: TFile,
		oldPath?: string
	) {
		if (!this.settings.watchFolder) return;

		// Find the latest canvas file in the parent folder
		const parentPath = file.path.split("/")[0];
		const normalizedFileName = normalizeFileName(
			this.settings.canvasFileName
		);
		const canvases = getCanvasFilesInFolder(parentPath, normalizedFileName);
		const canvasFile = canvases?.pop();

		if (!canvasFile) return;

		const canvasData: TCanvasData = JSON.parse(
			await this.app.vault.read(canvasFile)
		);

		if (action === "add") {
			if (canvasFile.parent) {
				const index = canvasFile.parent.children.filter(
					(file: TFile) => file.extension === "md"
				).length;

				const newNode = new CanvasNode(
					index,
					this.settings.nodesPerRow,
					file.path
				);

				canvasData.nodes.push(newNode.toJSON());
			}
		} else if (action === "remove") {
			canvasData.nodes = canvasData.nodes.filter(
				(node) => !node.file.endsWith(file.path)
			);
		} else if (action === "rename" && oldPath) {
			canvasData.nodes.forEach((node: TCanvasNode) => {
				if (node.file === oldPath) {
					node.file = file.path; // Update to the new file path
				}
			});
		}

		// Update the canvas file with modified data
		await this.app.vault.modify(
			canvasFile,
			JSON.stringify(canvasData, null, 2)
		);
		new Notice("Canvas updated.");
	}

	async triggerCommandById() {
		(this.app as any).commands.executeCommandById(COMMAND_FULL_ID);
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

		new Setting(containerEl)
			.setName("Canvas filename pattern")
			.setDesc(
				"Specify the default filename for a new canvas. (Cannot contain '/' or '\\')"
			)
			.addText((text) =>
				text
					.setPlaceholder("Canvas-<Date>.canvas")
					.setValue(this.plugin.settings.canvasFileName)
					.onChange(async (value) => {
						// Check for invalid characters
						if (/[\\/]/.test(value)) {
							new Notice(
								"Invalid characters: '/' and '\\' are not allowed."
							);
							text.setValue(this.plugin.settings.canvasFileName);
						} else {
							this.plugin.settings.canvasFileName =
								value || DEFAULT_SETTINGS.canvasFileName;
							await this.plugin.saveSettings();
						}
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
			.setName("Watch Canvas folder")
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
