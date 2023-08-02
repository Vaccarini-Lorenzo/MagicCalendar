import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import Tag from "../model/tag";
import {App, getAllTags} from "obsidian";
import SimplifiedFile from "../model/simplifiedFile";
import SafeController from "./safeController";

let tagHash: Map<number, Tag>;

export default class PluginController {
	private _iCloud: iCloudService;
	private _safeController: SafeController;
	tagHash: Map<number, Tag>;

	constructor(safeController: SafeController) {
		console.log("init pluginController");
		tagHash = new Map<number, Tag>();
		this._safeController = safeController;
	}

	async tryAuthentication(username: string, password: string): Promise<iCloudServiceStatus>{
		this._iCloud = new iCloudService({
			username,
			password,
			saveCredentials: true,
			trustDevice: true
		}, this._safeController);
		await this._iCloud.authenticate();
		return this._iCloud.status;
	}

	async MFACallback(mfa: string): Promise<iCloudServiceStatus> {
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

	async testCallback(uselessSignature: string): Promise<iCloudServiceStatus> {
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
			Array.from(tagHash.entries()).forEach((entry) => {
				const tag = entry[1];
				let duration = tag.endDate.getTime() - tag.startDate.getTime();
				if (duration == 0) duration = 60 // To fix, all day
				const newEvent = calendarService.createNewEvent("Europe/Rome", tag.title, tag.getDescription(), duration, events[0].pGuid, tag.startDate, tag.endDate);
				calendarService.postEvent(newEvent, cal.ctag);
			})
		}
		return this._iCloud.status;
	}

	fetchTags(app: App){
		const files = app.vault.getFiles();
		files.forEach((file) => {
			const fileCache = app.metadataCache.getFileCache(file)
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
		const matchStatus = tag.match(pattern);
		return matchStatus;
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
