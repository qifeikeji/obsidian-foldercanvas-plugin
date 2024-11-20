interface FileNameComponents {
	baseName: string;
	number: number | null;
	ext: string;
}

export const parseFileName = (fileName: string): FileNameComponents => {
	const baseParts = fileName
		.replace(".canvas", "")
		.match(/^(.*?)(?: (\d+))?$/);

	if (!baseParts) {
		throw new Error("Invalid filename format");
	}

	return {
		baseName: baseParts[1],
		number: baseParts[2] ? parseInt(baseParts[2]) : null,
		ext: ".canvas",
	};
};

export const normalizeFileName = (fileName: string) =>
	fileName.endsWith(".canvas") ? fileName : `${fileName}.canvas`;
