import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import Tag from "../model/tag";
import {App, getAllTags} from "obsidian";
import SimplifiedFile from "../model/simplifiedFile";
import SafeController from "./safeController";
import {readFileSync, createWriteStream, writeFileSync} from "fs";
import {iCloudCalendarCollection, iCloudCalendarService} from "../iCloudJs/calendar";

export default class PluginController {
	private _iCloud: iCloudService;
	private _safeController: SafeController;
	private _pendingTagsBuffer: number[];
	private _pluginPath: string;
	private _calendars: iCloudCalendarCollection[];
	private _calendarService: iCloudCalendarService;
	private _tagHash: Map<number, Tag>;
	private _dataLoadingComplete: boolean;

	constructor() {
		console.log("init pluginController");
		this._tagHash = new Map<number, Tag>();
		this._pendingTagsBuffer = [];
		this._calendars = [];
		this._dataLoadingComplete = false;
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
		this.preloadData();
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

	async preloadData() {
		console.log("preloading data: waiting for iCloud status");
		await this._iCloud.awaitReady;
		console.log("preloading data: Done");
		console.log("Fetching events!");
		this._calendarService = this._iCloud.getService("calendar");
		this._calendars = await this._calendarService.calendars();
		this._dataLoadingComplete = true;
	}

	async pushEvent(tag: Tag): Promise<boolean>{
		console.log("Pushing tag!");
		let duration = tag.endDate.getTime() - tag.startDate.getTime();
		// TODO
		// Implement, all day
		let calendar: iCloudCalendarCollection;
		if (tag.calendar == undefined)
			calendar = this._calendars.first();
		else
			calendar = this._calendars.filter(calendar => calendar.guid == tag.calendar)[0];
		if (duration == 0) duration = 60
		const newEvent = this._calendarService.createNewEvent("Europe/Rome", tag.title, tag.getDescription(), duration, calendar.guid, tag.startDate, tag.endDate);
		return await this._calendarService.postEvent(newEvent, calendar.ctag);
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
		this.manageSync(this);
	}

	// Why a local storage?
	// I need to keep track of the tags already synced
	// Periodically the local storage will be checked in order to sync
	// the remaining tags

	getLocalStorageTags(): Map<number, boolean> {
		console.log("getting local storage tags");
		try{
			const data = readFileSync(this._pluginPath + "/.tags.txt").toString('utf-8')
			const lines = data.split("\n");
			const tagMap = new Map<number, boolean>();
			lines.forEach(line => {
				console.log(`line = ${line}`);
				const hashSync = line.split(" ");
				const hash = hashSync[0];
				const isSync = hashSync[1];
				tagMap.set(Number(hash), isSync == "true");
				if(isSync == "false"){
					this._pendingTagsBuffer.push(Number(hash));
				}
			})
			return tagMap;
		} catch (e) {
			if (e.code === 'ENOENT') {
				console.log("No tags file found: Creating one")
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
		Array.from(this._tagHash.entries()).forEach((entry) => {
			const hash = entry[0];
			if(!tagMap.has(hash)){
				const newLine = `${hash} false\n`
				console.log(`New tag in local store!    ${newLine}`);
				writeStream.write(newLine);
				this._pendingTagsBuffer.push(Number(hash));
			}
		})
		writeStream.close();
		console.log("current buffer status");
		console.log(this._pendingTagsBuffer);
	}

	async manageSync(ref: any){
		console.log("Syncing!");
		if (ref._iCloud != undefined && ref._dataLoadingComplete){
			console.log("here!");
			ref.pushPendingTasks();
		} else {
			setTimeout(() => ref.manageSync(ref), 5000);
		}
	}

	async pushPendingTasks(){
		this._pendingTagsBuffer.forEach((tagHash) => {
			const tag = this._tagHash.get(tagHash);
			this.pushEvent(tag).then((pushed) => {
				if (pushed){
					// TODO: Update local storage changing the tag status to true (synced)
					// I was thinking about generalizing the updateLocalTagStorage method
					// It can take an array of tags and a method (ADD, UPDATE, DELETE) etc
				}
			});
		})
	}


	// Why the hash table?
	// The same iCal tag can be placed among different files and I'd need to travers
	// the whole tag structure to find if the new tag found is already in the structure (possibly multiple times)
	// With a hash table I can easily check in O(1)
	updateHashTable(tag: Tag){
		if(this._tagHash.has(tag.hash)){
			const oldTag = this._tagHash.get(tag.hash);
			tag = this.mergeFiles(tag, oldTag);
		}
		this._tagHash.set(tag.hash, tag);
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
		const pattern = /#\d{4}-\d{2}-\d{2}\/(\d{2}-\d{2}\/){0,2}[^/]*\/[^/]*\//
		const matchStatus = tag.match(pattern);
		return matchStatus;
	}
}
