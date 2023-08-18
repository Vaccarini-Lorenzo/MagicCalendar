import {App} from "obsidian";

export class Misc {
	static app: App;

	static isLowerCase(str) {
		return str === str.toLowerCase() &&
			str !== str.toUpperCase();
	}

	static fromSingleToDoubleDigit(num: number): string {
		if (num.toString().length == 1) return `0${num}`
		return num.toString();
	}

	static getCurrentFilePath(){
		const activeFile = Misc.app.workspace.getActiveFile();
		return activeFile == undefined ? "none": activeFile.path;
	}
}
