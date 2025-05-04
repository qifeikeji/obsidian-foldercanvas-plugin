import { FolderCanvasPluginSettings } from "src/main";

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
    filePath: string,
    settings: FolderCanvasPluginSettings,
    centerX?: number,
    centerY?: number
  ) {
    const { nodesPerRow, nodeWidth, nodeHeight, nodeSpacing } = settings;

    this.id = `node-${index}`;
    this.width = nodeWidth;
    this.height = nodeHeight;
    this.type = "file";
    this.file = filePath;

    // If centerX and centerY are provided, position the node at the center
    if (centerX !== undefined && centerY !== undefined) {
      this.x = centerX - nodeWidth / 2; // Center the node horizontally
      this.y = centerY - nodeHeight / 2; // Center the node vertically
    } else {
      // Default grid-based positioning
      this.x = (index % nodesPerRow) * (nodeWidth + nodeSpacing);
      this.y = Math.floor(index / nodesPerRow) * (nodeHeight + nodeSpacing);
    }
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
