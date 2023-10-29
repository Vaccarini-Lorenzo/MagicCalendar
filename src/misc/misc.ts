import {App, requestUrl} from "obsidian";
import {CloudEvent} from "../model/events/cloudEvent";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import {readFileSync} from "fs";
import * as net from "net";
import http from "http";

export class Misc {
	static app: App;
	static base64Media: {appleIcon, googleIcon};
	static credentialKeyList = ["iCalSyncUsername", "iCalSyncPassword", "trustToken", "clientId", "clientSecret", "refreshToken", "tokenType", "accessToken"];
	static dragEvent: any;
	static bindListeners: {type:string, doc: Document, eventCallback: (event) => void}[] = [];
	static credentials: {client_id: string, client_secret: string};
	private static notificationPort: number;

	static sleep(ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

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

	static sortCloudEventList(events: CloudEvent[]) {
		return events.sort(function (a, b) {
			return a.cloudEventStartDate.getTime() - b.cloudEventEndDate.getTime()
		});
	}

	static generateICloudUUID(): string {
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

	static generateGoogleCloudUUID(): string {
		const maxIntEightNibbles = 4294967295;
		const firstUUID = iCloudMisc.getRandomHex(maxIntEightNibbles);
		return `${firstUUID}`
	}

	static loadMedia(mediaPath: string){
		const jsonBase64Media = readFileSync(mediaPath).toString();
		Misc.base64Media = JSON.parse(jsonBase64Media);
	}

	static getBase64AppleIcon(): string {
		return Misc.base64Media.appleIcon;
	}

	static getBase64GoogleIcon(): string {
		return Misc.base64Media.googleIcon;
	}

	static generateCellID(dateString: string, i: number): string {
		const millisInHalfHour = 1800000;
		const milliSurplus = millisInHalfHour * i;
		const cellDate = new Date(dateString.replace(/ - \d+/, ''));
		cellDate.setTime(cellDate.getTime() + milliSurplus);
		return cellDate.toISOString();
	}

	static cellIndexFromID(id: string, offset?: number): number{
		const cellDate = new Date(id);
		let minutes = cellDate.getMinutes() + cellDate.getHours() * 60;
		if (offset) minutes += offset * 30;
				return Math.round(minutes / 30);
	}

	static getStartDateFromCellID(id: string) {
		return new Date(id);
	}

	static getTimeFromColSpan(dragColSpan: string): number {
		const millisInHalfHour = 1800000;
		return Number(dragColSpan) * millisInHalfHour;
	}

	static async fetchCred() {
		const credResponse = await requestUrl("https://magiccalendaroauthserver.onrender.com/cred");
		Misc.credentials = credResponse.json.installed;
			}

	static async getPortFree():Promise<number> {
		return new Promise( res => {
			const srv = net.createServer();
			srv.listen(0, () => {
				const port = (srv.address() as net.AddressInfo).port
				srv.close((err) => res(port))
			});
		})
	}



}
