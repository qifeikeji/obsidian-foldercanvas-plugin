import { App, TFile, Notice, TAbstractFile } from "obsidian";
import { normalizeFileName, parseFileName } from "src/utils";
import CanvasNode from "./CanvasNode";
import { FolderCanvasPluginSettings } from "src/main";

function getCanvasFilesInFolder(folderPath: string, basename: string): TFile[] {
  const folder = this.app.vault.getFolderByPath(folderPath);
  if (!folder) return [];

  const files: TFile[] = [];

  const getAllFiles = (file: TAbstractFile) => {
    if (file instanceof TFile) {
      if (file.extension === "canvas" && file.path.includes(basename)) {
        files.push(file);
      }
    } else if (file instanceof TFolder) {
      file.children.forEach((child: TAbstractFile) => getAllFiles(child));
    }
  };

  getAllFiles(folder);
  return files;
}

function generateUniqueFileName(folderPath: string, fileName: string): string {
  const normalizedFileName = normalizeFileName(fileName);
  const components = parseFileName(normalizedFileName);
  const existingFiles = getCanvasFilesInFolder(folderPath, components.baseName);

  let highestNumber = 0;
  existingFiles.forEach((file: TFile) => {
    const existingComponents = parseFileName(file.name);
    highestNumber = existingComponents.number ?? 1;
  });

  const newFileName =
    highestNumber === 0
      ? normalizedFileName
      : `${components.baseName} ${highestNumber + 1}${components.ext}`;
  return `${folderPath}/${newFileName}`;
}

export async function createCanvasWithNodes(
  app: App,
  folderPath: string,
  files: TFile[],
  canvasFileName: string,
  settings: FolderCanvasPluginSettings
) {
  if (files.length === 0) {
    new Notice("The folder is empty!");
    return;
  }

  const canvasFileNameWithFolder = generateUniqueFileName(
    folderPath,
    canvasFileName
  );

  const canvasData = {
    nodes: files
      .map((file, index) => {
        try {
          return new CanvasNode(index, file.path, settings);
        } catch (error) {
          console.log(error);
          return null;
        }
      })
      .filter((node) => node !== null),
    edges: [],
  };

  const canvasFile = await app.vault.create(
    canvasFileNameWithFolder,
    JSON.stringify(canvasData, null, 2)
  );

  if (settings.openOnCreate) {
    await app.workspace.openLinkText(canvasFileNameWithFolder, "", true);
  }

  if (canvasFile) {
    new Notice(`Canvas created at ${canvasFileNameWithFolder}`);
  } else {
    new Notice("Failed to create a Canvas file.");
  }
}
