export const NODE_WIDTH = 250;
export const NODE_HEIGHT = 100;
export const NODE_SPACING = 20;

export type TCanvasNode = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	type: string;
	file: string;
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

	constructor(
		index: number,
		nodesPerRow: number,
		filePath: string,
		nodeWidth?: number,
		nodeHeight?: number,
		spacing?: number
	) {
		nodeWidth = nodeWidth || NODE_WIDTH;
		nodeHeight = nodeHeight || NODE_HEIGHT;
		spacing = spacing || NODE_SPACING;

		this.id = `node-${index}`;
		this.x = (index % nodesPerRow) * (nodeWidth + spacing);
		this.y = Math.floor(index / nodesPerRow) * (nodeHeight + spacing);
		this.width = nodeWidth;
		this.height = nodeHeight;
		this.type = "file";
		this.file = filePath;
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
		};
	}
}

export default CanvasNode;
