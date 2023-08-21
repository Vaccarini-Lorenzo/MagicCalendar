import {App} from "obsidian";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";

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

	static getDateFromICloudArray(array: number[]){
		return new Date(`${array[1]}-${array[2]}-${array[3]} ${array[4]}:${array[5]}`)
	}

	static sortICloudCalendarEventList(events: iCloudCalendarEvent[]) {
		const tmpMap = new Map();
		events.forEach(event => {
			const startDate = Misc.getDateFromICloudArray(event.startDate);
			tmpMap.set(event, startDate);
		})
		const sorted = new Map([...tmpMap].sort((a, b) => a[1] - b[1]));
		return Array.from(sorted.keys());
	}
}
