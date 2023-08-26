import {App} from "obsidian";
import {CloudEvent} from "../model/events/cloudEvent";
import iCloudMisc from "../iCloudJs/iCloudMisc";

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

	static sortICloudCalendarEventList(events: CloudEvent[]) {
		const tmpMap = new Map();
		events.forEach(event => {
			const startDate = event.cloudEventStartDate;
			tmpMap.set(event, startDate);
		})
		const sorted = new Map([...tmpMap].sort((a, b) => a[1] - b[1]));
		return Array.from(sorted.keys());
	}

	static generateNewICloudUUID(): string {
		const maxIntEightNibbles = 4294967295;
		const maxIntFourNibbles = 65535;
		const maxIntTwelveNibbles = 281474976710655;
		const firstUUID = iCloudMisc.getRandomHex(maxIntEightNibbles);
		const secondUUID = iCloudMisc.getRandomHex(maxIntFourNibbles);
		const thirdUUID = iCloudMisc.getRandomHex(maxIntFourNibbles);
		const fourthUUID = iCloudMisc.getRandomHex(maxIntFourNibbles);
		const lastUUID = iCloudMisc.getRandomHex(maxIntTwelveNibbles);
		return `${firstUUID}-${secondUUID}-${thirdUUID}-${fourthUUID}-${lastUUID}`
	}
}
