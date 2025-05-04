import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  TFolder,
} from "obsidian";
import CanvasNode, { TCanvasData, TCanvasNode } from "src/components/CanvasNode";
import { createCanvasWithNodes } from "./components/CanvasGenerator";
import { FolderSuggestModal } from "./components/FolderSuggestModal";
import { normalizeFileName, parseFileName } from "./utils";

export interface FolderCanvasPluginSettings {
  nodesPerRow: number;
  openOnCreate: boolean;
  canvasFileName: string;
  watchFolder: boolean;
  nodeWidth: number;
  nodeHeight: number;
  nodeSpacing: number;
  maxWidth: number;
  maxHeight: number;
  maxSpacing: number;
  selectedHeading: string;
}

const DEFAULT_SETTINGS: FolderCanvasPluginSettings = {
  nodesPerRow: 4,
  openOnCreate: true,
  canvasFileName: `Canvas-${Date.now()}.canvas`,
  watchFolder: true,
  nodeWidth: 250,
  nodeHeight: 100,
  nodeSpacing: 20,
  maxWidth: 1000,
  maxHeight: 1000,
  maxSpacing: 100,
  selectedHeading: "",
};

const PLUGIN_NAME = "foldercanvas";
const COMMMAND_ID = "generate-canvas-from-folder";
const COMMAND_NAME = "Generate Canvas from folder";
const COMMAND_FULL_ID = `${PLUGIN_NAME}:${COMMMAND_ID}`;

export default class FolderCanvasPlugin extends Plugin {
  settings: FolderCanvasPluginSettings;

  async onload() {
    await this.loadSettings();

    // 原有的调色板图标
    this.addRibbonIcon("palette", "Folder Canvas", (evt: MouseEvent) =>
      this.triggerCommandById()
    );

    // 新增的加号图标
    this.addRibbonIcon("plus", "Add Canvas to Current", async (evt: MouseEvent) => {
      await this.addNewCanvasToCurrent();
    });

    this.addSettingTab(new FolderCanvasSettingTab(this.app, this));

    this.addCommand({
      id: COMMMAND_ID,
      name: COMMAND_NAME,
      callback: async () => {
        new FolderSuggestModal(this.app, async (folder) => {
          try {
            await this.generateCanvas(folder);
          } catch (error) {
            new Notice("Failed to generate a Canvas file. Please try again.");
            console.error(error);
          }
        }).open();
      },
    });

    // 原有的 editor-menu 事件
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        menu.addItem((item) => {
          item
            .setTitle("Generate a Canvas view")
            .setIcon("palette")
            .onClick(async () => this.triggerCommandById());
        });
      })
    );

    // 原有的 file-menu 事件
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle("Generate a Canvas view")
            .setIcon("palette")
            .onClick(async () => this.triggerCommandById());
        });
      })
    );

    // 文件右键菜单项
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile && file.extension === "canvas") {
          menu.addItem((item) => {
            item
              .setTitle("Add New Canvas")
              .setIcon("plus")
              .onClick(async () => {
                await this.addNewCanvasToCurrent();
              });
          });
        }
      })
    );

    // 新增白板区域右键菜单项
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === "canvas") {
          menu.addItem((item) => {
            item
              .setTitle("Add New Canvas")
              .setIcon("plus")
              .onClick(async () => {
                await this.addNewCanvasToCurrent();
              });
          });
        }
      })
    );

    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(
        this.app.vault.on("create", async (file) => {
          if (file instanceof TFile && file.extension === "canvas") {
            setTimeout(() => this.updateCanvas("add", file), 100);
          }
        })
      );

      this.registerEvent(
        this.app.vault.on("delete", async (file) => {
          if (file instanceof TFile && file.extension === "canvas") {
            this.updateCanvas("remove", file);
          }
        })
      );

      this.registerEvent(
        this.app.vault.on("rename", async (file, oldPath) => {
          if (file instanceof TFile && file.extension === "canvas") {
            setTimeout(() => this.updateCanvas("rename", file, oldPath), 100);
          }
        })
      );
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async generateCanvas(folder: TFolder) {
    const canvasFilename = this.settings.canvasFileName;
    const activeFile = this.app.workspace.getActiveFile();

    const files = folder.children.filter(
      (file): file is TFile =>
        file instanceof TFile &&
        file.extension === "canvas" &&
        (activeFile ? file.path !== activeFile.path : true)
    );

    await createCanvasWithNodes(
      this.app,
      folder.path,
      files,
      canvasFilename,
      this.settings
    );
  }

  async getCurrentCanvasFile(file: TFile) {
    const parentPath = file.path.split("/")[0];
    const folder = this.app.vault.getFolderByPath(parentPath);
    if (!folder) return;

    const canvases: TFile[] = [];
    const activeFile = this.app.workspace.getActiveFile();

    const getCurrentCanvas = (file: TAbstractFile) => {
      if (file instanceof TFile) {
        const normalizedFileName = normalizeFileName(this.settings.canvasFileName);
        const components = parseFileName(normalizedFileName);
        if (
          file.extension === "canvas" &&
          file.path.includes(components.baseName) &&
          (activeFile ? file.path !== activeFile.path : true)
        ) {
          canvases.push(file);
        }
      } else if (file instanceof TFolder) {
        file.children.forEach((child: TAbstractFile) => getCurrentCanvas(child));
      }
    };

    getCurrentCanvas(folder);
    return canvases?.pop();
  }

  async updateCanvas(
    action: "add" | "remove" | "rename",
    file: TFile,
    oldPath?: string
  ) {
    if (!this.settings.watchFolder) return;

    const canvasFile = await this.getCurrentCanvasFile(file);
    if (!canvasFile) return;

    const canvasData: TCanvasData = JSON.parse(await this.app.vault.read(canvasFile));
    const activeFile = this.app.workspace.getActiveFile();

    if (action === "add") {
      if (
        canvasFile.parent &&
        (!activeFile || file.path !== activeFile.path)
      ) {
        const index = canvasFile.parent.children.filter(
          (f: TFile) =>
            f.extension === "canvas" &&
            (!activeFile || f.path !== activeFile.path)
        ).length;

        const newNode = new CanvasNode(index, file.path, this.settings);
        canvasData.nodes.push(newNode.toJSON());
      }
    } else if (action === "remove") {
      canvasData.nodes = canvasData.nodes.filter(
        (node) => !node.file.endsWith(file.path)
      );
    } else if (action === "rename" && oldPath) {
      canvasData.nodes.forEach((node: TCanvasNode) => {
        if (node.file === oldPath) {
          node.file = file.path;
        }
      });
    }

    await this.app.vault.modify(
      canvasFile,
      JSON.stringify(canvasData, null, 2)
    );
    new Notice("Canvas updated.");
  }

  async triggerCommandById() {
    (this.app as any).commands.executeCommandById(COMMAND_FULL_ID);
  }

  async getHeadings(): Promise<string[]> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return [];

    return new Promise<string[]>((resolve) => {
      this.app.vault.read(activeFile).then((content) => {
        const headings = content
          .split("\n")
          .filter((line) => line.trim().match(/^#+\s+/))
          .map((line) => line.replace(/^#+\s*/, ""));
        resolve(headings);
      });
    });
  }

  async addNewCanvasToCurrent() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== "canvas") {
      new Notice("请先打开一个Canvas文件。");
      return;
    }

    const folderPath = activeFile.parent?.path || "/";
    const newCanvasName = `New-Canvas-${Date.now()}.canvas`;

    const newCanvasData = {
      nodes: [],
      edges: [],
    };
    const newCanvasFile = await this.app.vault.create(
      `${folderPath}/${newCanvasName}`,
      JSON.stringify(newCanvasData, null, 2)
    );

    if (!newCanvasFile) {
      new Notice("创建新的Canvas文件失败。");
      return;
    }

    const currentCanvasData: TCanvasData = JSON.parse(
      await this.app.vault.read(activeFile)
    );

    // 获取当前canvas视图的视口中心
    const canvasView = this.app.workspace.getActiveViewOfType<any>(Object);
    let centerX = 0;
    let centerY = 0;

    if (canvasView && canvasView.canvas) {
      const canvas = canvasView.canvas;
      const { zoom, camera } = canvas;
      const container = canvas.containerEl.getBoundingClientRect();
      const viewportWidth = container.width;
      const viewportHeight = container.height;

      // 计算视口中心在canvas坐标系中的位置
      // camera.x, camera.y 是canvas的偏移量，zoom 是缩放比例
      centerX = -camera.x / zoom + viewportWidth / (2 * zoom);
      centerY = -camera.y / zoom + viewportHeight / (2 * zoom);
    }

    const index = currentCanvasData.nodes.length;
    const newNode = new CanvasNode(index, newCanvasFile.path, this.settings, centerX, centerY);

    currentCanvasData.nodes.push(newNode.toJSON());

    await this.app.vault.modify(
      activeFile,
      JSON.stringify(currentCanvasData, null, 2)
    );

    new Notice(`新Canvas已创建并添加：${newCanvasName}`);
  }
}

class FolderCanvasSettingTab extends PluginSettingTab {
  plugin: FolderCanvasPlugin;

  constructor(app: App, plugin: FolderCanvasPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Canvas文件名格式")
      .setDesc(
        "指定新canvas的默认文件名。（不能包含 '/' 或 '\\'）"
      )
      .addText((text) =>
        text
          .setPlaceholder("Canvas-<Date>.canvas")
          .setValue(this.plugin.settings.canvasFileName)
          .onChange(async (value) => {
            if (/[\\/]/.test(value)) {
              new Notice("无效字符：不允许使用 '/' 和 '\\'。");
              text.setValue(this.plugin.settings.canvasFileName);
            } else {
              this.plugin.settings.canvasFileName =
                value || DEFAULT_SETTINGS.canvasFileName;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("创建后自动打开Canvas")
      .setDesc("创建新Canvas文件后自动打开。")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openOnCreate)
          .onChange(async (value) => {
            this.plugin.settings.openOnCreate = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("监控Canvas文件夹")
      .setDesc(
        "当文件夹中的文件添加或删除时自动更新Canvas。"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.watchFolder)
          .onChange(async (value) => {
            this.plugin.settings.watchFolder = value;
            await this.plugin.saveSettings();
          })
      );

    const nodesPerRowSetting = new Setting(containerEl)
      .setName(`每行节点数：${this.plugin.settings.nodesPerRow}`)
      .setDesc("Canvas中每行显示的节点数。")
      .addSlider((slider) =>
        slider
          .setLimits(1, 10, 1)
          .setValue(this.plugin.settings.nodesPerRow)
          .onChange(async (value) => {
            this.plugin.settings.nodesPerRow = value;
            await this.plugin.saveSettings();
            nodesPerRowSetting.setName(`每行节点数：${value}`);
          })
      );

    let nodeWidthInput: HTMLInputElement;
    new Setting(containerEl)
      .setName("节点宽度")
      .setDesc("设置节点的宽度（默认：250，最大：1000）。")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.nodeWidth.toString())
          .onChange(async (value) => {
            const parsedValue = this.validateInput(
              value,
              this.plugin.settings.maxWidth
            );
            this.plugin.settings.nodeWidth = parsedValue;
            await this.plugin.saveSettings();
          });
        nodeWidthInput = text.inputEl;
      })
      .addButton((button) => {
        button
          .setButtonText("重置")
          .setTooltip("恢复默认值")
          .onClick(async () => {
            this.plugin.settings.nodeWidth = DEFAULT_SETTINGS.nodeWidth;
            await this.plugin.saveSettings();
            nodeWidthInput.value = DEFAULT_SETTINGS.nodeWidth.toString();
          });
      });

    let nodeHeightInput: HTMLInputElement;
    new Setting(containerEl)
      .setName("节点高度")
      .setDesc("设置节点的高度（默认：100，最大：1000）。")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.nodeHeight.toString())
          .onChange(async (value) => {
            const parsedValue = this.validateInput(
              value,
              this.plugin.settings.maxWidth
            );
            this.plugin.settings.nodeHeight = parsedValue;
            await this.plugin.saveSettings();
          });
        nodeHeightInput = text.inputEl;
      })
      .addButton((button) => {
        button
          .setButtonText("重置")
          .setTooltip("恢复默认值")
          .onClick(async () => {
            this.plugin.settings.nodeHeight = DEFAULT_SETTINGS.nodeHeight;
            await this.plugin.saveSettings();
            nodeHeightInput.value = DEFAULT_SETTINGS.nodeHeight.toString();
          });
      });

    let nodeSpacingInput: HTMLInputElement;
    new Setting(containerEl)
      .setName("节点间距")
      .setDesc("设置节点之间的间距（默认：20，最大：100）。")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.nodeSpacing.toString())
          .onChange(async (value) => {
            const parsedValue = this.validateInput(
              value,
              this.plugin.settings.maxWidth
            );
            this.plugin.settings.nodeSpacing = parsedValue;
            await this.plugin.saveSettings();
          });
        nodeSpacingInput = text.inputEl;
      })
      .addButton((button) => {
        button
          .setButtonText("重置")
          .setTooltip("恢复默认值")
          .onClick(async () => {
            this.plugin.settings.nodeSpacing = DEFAULT_SETTINGS.nodeSpacing;
            await this.plugin.saveSettings();
            nodeSpacingInput.value = DEFAULT_SETTINGS.nodeSpacing.toString();
          });
      });

    const headings = await this.plugin.getHeadings();

    new Setting(containerEl)
      .setName("筛选标题")
      .setDesc(
        "从活动文件中选择一个标题，应用于Canvas文件中的所有节点。"
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("", "选择一个标题");
        headings.forEach((heading) => dropdown.addOption(heading, heading));
        dropdown.setValue(this.plugin.settings.selectedHeading);
        dropdown.onChange(async (value) => {
          this.plugin.settings.selectedHeading = value;
          await this.plugin.saveSettings();
        });
      });
  }

  validateInput(value: string, max: number): number {
    let num = parseInt(value, 10);
    if (isNaN(num)) {
      num = 0;
    }
    return Math.min(num, max);
  }
}
