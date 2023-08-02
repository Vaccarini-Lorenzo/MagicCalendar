import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import Tag from "../model/tag";
import {App, getAllTags} from "obsidian";
import SimplifiedFile from "../model/simplifiedFile";
import SafeController from "./safeController";
import {readFileSync, createWriteStream, writeFileSync} from "fs";

let tagHash: Map<number, Tag>;

export default class PluginController {
	private _iCloud: iCloudService;
	private _safeController: SafeController;
	_pluginPath: string;

	constructor() {
		console.log("init pluginController");
		tagHash = new Map<number, Tag>();
	}

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
	}

	injectSafeController(safeController: SafeController){
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
		this.updateLocalTagStorage();
	}

	// Why a local storage?
	// I need to keep track of the tags already synced
	// Periodically the local storage will be checked in order to sync
	// the remaining tags

	getLocalStorageTags(): Map<number, boolean> {
		try{
			const data = readFileSync(this._pluginPath + "/.tags.txt").toString('utf-8')
			const lines = data.split("\n");
			const tagMap = new Map<number, boolean>();
			lines.forEach(line => {
				const hashSync = line.split(" ");
				tagMap.set(Number(hashSync[0]), hashSync[1] == "true");
			})
			return tagMap;
		} catch (e) {
			console.log("No tags file found: Creating one")
			if (e.code === 'ENOENT') {
				writeFileSync(this._pluginPath + "/.tags.txt", "");
			}
			return new Map<number, boolean>();
		}
	}


	updateLocalTagStorage(){
		const tagMap = this.getLocalStorageTags();
		console.log("Found these tags:")
		console.log(JSON.stringify(Array.from(tagMap.entries())));
		const writeStream = createWriteStream(this._pluginPath + "/.tags.txt", {flags: 'a'});
		Array.from(tagHash.entries()).forEach((entry) => {
			if(!tagMap.has(entry[0])){
				console.log("New tag in local store!");
				const newLine = `${entry[0]} false\n`
				writeStream.write(newLine);
			}
		})
		writeStream.close();
	}

	// Why the hash table?
	// The same iCal tag can be placed among different files and I'd need to travers
	// the whole tag structure to find if the new tag found is already in the structure (possibly multiple times)
	// With a hash table I can easily check in O(1)
	updateHashTable(tag: Tag){
		if(tagHash.has(tag.hash)){
			const oldTag = tagHash.get(tag.hash);
			tag = this.mergeFiles(tag, oldTag);
		}
		tagHash.set(tag.hash, tag);
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
}
