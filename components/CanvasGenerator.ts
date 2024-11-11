import { App, TFile, Notice, TAbstractFile } from "obsidian";
import { parseFileName } from "utils";
import CanvasNode from "./CanvasNode";

function getCanvasFilesInFolder(basename: string, folderPath: string): TFile[] {
	const folder = this.app.vault.getAbstractFileByPath(folderPath);
	if (!folder) return [];

	const files: TFile[] = [];

	const getAllFiles = (file: TAbstractFile) => {
		if (file instanceof TFile) {
			if (file.extension === "canvas" && file.path.includes(basename)) {
				files.push(file);
			}
		} else {
			// @ts-ignore - Accessing children property of TFolder
			file.children?.forEach((child) => getAllFiles(child));
		}
	};

	getAllFiles(folder);
	return files;
}

function generateUniqueFileName(folderPath: string, fileName: string): string {
	const normalizedFileName = fileName.endsWith(".canvas")
		? fileName
		: `${fileName}.canvas`;

	const components = parseFileName(normalizedFileName);
	const existingFiles = getCanvasFilesInFolder(
		components.baseName,
		folderPath
	);

	// Find the highest number used in existing files with the same base name
	let highestNumber = 0;
	existingFiles.forEach((file: TFile) => {
		const existingComponents = parseFileName(file.name);
		highestNumber = existingComponents.number ?? 1;
	});

	// Generate the next available number
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
	nodesPerRow: number,
	openOnCreate: boolean,
	canvasFileName: string
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
		nodes: files.map(
			(file, index) => new CanvasNode(index, nodesPerRow, file.path)
		),
		edges: [],
	};

	const canvasFile = await app.vault.create(
		canvasFileNameWithFolder,
		JSON.stringify(canvasData, null, 2)
	);

	if (openOnCreate) {
		await app.workspace.openLinkText(canvasFileNameWithFolder, "", true);
	}

	if (canvasFile) {
		new Notice(`Canvas created at ${canvasFileNameWithFolder}`);
	} else {
		new Notice("Failed to create canvas file.");
	}
}
