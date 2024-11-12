import { App, TFolder, SuggestModal } from "obsidian";

export class FolderSuggestModal extends SuggestModal<TFolder> {
	private onSelect: (folder: TFolder) => void;

	constructor(app: App, onSelect: (folder: TFolder) => void) {
		super(app);
		this.onSelect = onSelect;
	}

	getSuggestions(query: string): TFolder[] {
		const folders: TFolder[] = [];

		// Recursively find folders in the vault
		const addFolder = (folder: TFolder) => {
			folders.push(folder);
			folder.children.forEach((child) => {
				if (child instanceof TFolder) {
					addFolder(child);
				}
			});
		};

		const allFolders: TFolder[] = this.app.vault
			.getRoot()
			.children.filter((f): f is TFolder => f instanceof TFolder);

		for (const folder of allFolders) {
			addFolder(folder);
		}

		// Filter folders based on user query
		return folders.filter((folder) =>
			folder.path.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement) {
		el.createEl("div", { text: folder.path });
	}

	onChooseSuggestion(folder: TFolder) {
		this.onSelect(folder);
	}
}
