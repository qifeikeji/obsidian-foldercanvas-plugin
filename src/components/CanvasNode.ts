import { FolderCanvasPluginSettings } from "src/main";

export type TCanvasNode = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	type: string;
	file: string;
	// subpath?: string; // 可选择移除此字段，因为不再需要
};

export type TCanvasData = {
	nodes: TCanvasNode[];
	edges: {
		id: string;
		source: string;
		target: string;
	}[];
};

class CanvasNode {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	type: string;
	file: string;
	// subpath?: string; // 可选择移除此字段

	constructor(
		index: number,
		filePath: string,
		settings: FolderCanvasPluginSettings
	) {
		const { nodesPerRow, nodeWidth, nodeHeight, nodeSpacing } = settings;

		this.id = `node-${index}`;
		this.x = (index % nodesPerRow) * (nodeWidth + nodeSpacing);
		this.y = Math.floor(index / nodesPerRow) * (nodeHeight + nodeSpacing);
		this.width = nodeWidth;
		this.height = nodeHeight;
		this.type = "file";
		this.file = filePath;
		// 移除 subpath 逻辑，因为 .canvas 文件不需要标题
	}

	toJSON() {
		return {
			id: this.id,
			x: this.x,
			y: this.y,
			width: this.width,
			height: this.height,
			type: this.type,
			file: this.file,
			// subpath: this.subpath, // 移除此字段
		};
	}
}

export default CanvasNode;
