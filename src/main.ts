import {getAllTags, Plugin, TFile} from 'obsidian';
import {ExampleModal} from "./modal";
import iCloudService, {iCloudServiceStatus} from "./iCloudJs";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

// TODO:
// Move these test classes in another module


// TODO:
// Big ass refactor, need to move logic

class SimplifiedFile {
	name: string;
	path: string;

	constructor(name: string, path: string) {
		this.name = name;
		this.path = path;
	}
}

class Tag {
	tag: string;
	title: string;
	startDate: Date;
	endDate: Date;
	files: SimplifiedFile[];
	timer: NodeJS.Timer;
	timerDuration: number;
	callback: () => void;

	constructor(tag: string, timerDuration: number, callback: () => void) {
		this.tag = tag;
		this.parseDates();
		this.parseTitle();
		this.files = [];
		this.timerDuration = timerDuration;
		this.timer = setTimeout(callback, timerDuration);
	}

	private parseDates(){
		const splitted = this.tag.split("/")
		const dateComponents = splitted[1].split("-");
		let startHourComponents: string[];
		let endHourComponents: string[];

		// No checks, I'm assuming my regex works

		if (splitted.length == 5){
			startHourComponents = splitted[2].split("-");
			endHourComponents = splitted[3].split("-");
		}

		if (dateComponents.length == 3 && (startHourComponents == undefined || endHourComponents == undefined)){
			// All day event
			this.startDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]));
			this.endDate = this.startDate;
			return;
		}

		this.startDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]),
			Number(startHourComponents[0]), Number(startHourComponents[1]));
		this.endDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]),
			Number(endHourComponents[0]), Number(endHourComponents[1]));
	}

	parseTitle(){
		const splitted = this.tag.split("/")
		this.title = splitted[splitted.length - 1].replace("_", " ");
	}

	resetTimer(){
		clearTimeout(this.timer);
	}

	updateTimer(duration: number){
		this.resetTimer();
		this.timer = setTimeout(this.callback, duration);
	}

	linkFile(file: SimplifiedFile){
		this.files.push(file);
	}

	getDescription(): string {
		let description = "reference: "
		this.files.forEach(file => description += `${file.name}, `);
		return description;
	}
}

let tagHash: Map<number, Tag>;


export default class ExamplePlugin extends Plugin {
	settings: MyPluginSettings;
	_iCloud: iCloudService;

	async iCloudLogin(username: string, password: string): Promise<iCloudServiceStatus> {
		this._iCloud = new iCloudService({
			username,
			password,
			saveCredentials: true,
			trustDevice: true
		});

		await this._iCloud.authenticate();
		return this._iCloud.status;
	}

	/*
	async iCloudMfa(mfa: string): Promise<iCloudServiceStatus> {
		await this._iCloud.provideMfaCode(mfa);
		await this._iCloud.awaitReady;
		console.log(this._iCloud.status);
		if (this._iCloud.status == iCloudServiceStatus.Ready){
			console.log("Fetching events!");
			const calendarService = this._iCloud.getService("calendar");
			const events = await calendarService.events();
			events.forEach((event) => console.log(JSON.stringify(event)));
		}
		return this._iCloud.status;
	}
	*/

	async test(useless: string): Promise<iCloudServiceStatus> {
		await this._iCloud.awaitReady;
		if (this._iCloud.status == iCloudServiceStatus.Ready){
			console.log("Fetching events!");
			const calendarService = this._iCloud.getService("calendar");
			const events = await calendarService.events();
			const calendars = await calendarService.calendars();
			const cal = calendars.filter(c => c.guid == events[0].pGuid)[0];
			events.forEach((event) => console.log(JSON.stringify(event)));
			const eventDetail = await calendarService.eventDetails(events[0].pGuid, events[0].guid);
			console.log(`Let's get first your event detail: ${JSON.stringify(eventDetail)}`);

			console.log("Pushing events!");
			tagHash.forEach((tag, hash) => {
				let duration = tag.endDate.getTime() - tag.startDate.getTime();
				if (duration == 0) duration = 60 // To fix, all day
				const newEvent = calendarService.createNewEvent("Europe/Rome", tag.title, tag.getDescription(), duration, events[0].pGuid, tag.startDate, tag.endDate);
				calendarService.postEvent(newEvent, cal.ctag);
			})
		}
		return this._iCloud.status;
	}

	async onload() {
		console.log("fetching tags...")
		this.fetchTags();
		console.log(tagHash);
/*
		this.registerEvent(
			this.app.metadataCache.on('create', (tagName: string) => {
				// Handle the event when a new tag is created

			})
		);
		 */

		this.registerEvent(this.app.metadataCache.on('changed', (file, data, cache) => {
			cache.tags.forEach(t => console.log(t));
			console.log(JSON.stringify(cache.blocks));
		}));
		this.registerEvent(this.app.metadataCache.on('deleted', (file, data) => {
			console.log("DELETED!");
			console.log(`file = ${file}\n\ndata=${data}\n\n`)
		}))

		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				new ExampleModal(this.app, this.iCloudLogin, this.test).open();
			},
		});
	}
	async onunload() {
		// Release any resources configured by the plugin.
		//proxy.stop();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	fetchTags(){
		tagHash = new Map<number, Tag>();
		const files = this.app.vault.getFiles();
		files.forEach((file) => {
			const fileCache = this.app.metadataCache.getFileCache(file)
			const fileTags = getAllTags(fileCache);
			const filteredTags = fileTags.filter(tag => this.checkRegex(tag));
			filteredTags.forEach(filteredTag => {
				const tag = new Tag(filteredTag.toString(), 10, () => console.log("Timer went off!"));
				tag.linkFile(new SimplifiedFile(file.name, file.path))
				this.updateHashTable(tag);
			});
		});
	}

	updateHashTable(tag: Tag){
		const hash = this.hash(tag);
		if(tagHash.has(hash)){
			const oldTag = tagHash.get(hash);
			tag = this.mergeFiles(tag, oldTag);
		}
		tagHash.set(hash, tag);
	}

	mergeFiles(newTag: Tag, oldTag: Tag): Tag {
		oldTag.files.forEach((file) => {
			if (!newTag.files.contains(file)){
				newTag.files.push(file);
			}
		})
		return newTag;
	}

	checkRegex(tag): boolean{
		const pattern = /#ical\/\d{4}-\d{2}-\d{2}\/(\d{2}-\d{2}\/){0,2}[^/]*\//
		return tag.match(pattern);
	}

	hash(tag: Tag): number{
		const tagProperties = tag.tag + tag.startDate.toISOString() + tag.endDate.toISOString();
		let hash = 0,
			i, chr;
		if (tagProperties.length === 0) return hash;
		for (i = 0; i < tagProperties.length; i++) {
			chr = tagProperties.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}

}


