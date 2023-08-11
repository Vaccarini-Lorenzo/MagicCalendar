import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import Event from "../model/event";
import {App} from "obsidian";
import SafeController from "./safeController";
import {readFileSync, createWriteStream, writeFileSync} from "fs";
import {iCloudCalendarCollection, iCloudCalendarService} from "../iCloudJs/calendar";

export default class ICloudController {
	private _iCloud: iCloudService;
	private _safeController: SafeController;
	private _pendingTagsBuffer: number[];
	private _pluginPath: string;
	private _calendars: iCloudCalendarCollection[];
	private _calendarService: iCloudCalendarService;
	private _tagHash: Map<number, Event>;
	private _dataLoadingComplete: boolean;
	private app: App;

	constructor() {
		this._tagHash = new Map<number, Event>();
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

	injectApp(app: App){
		this.app = app;
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
		return this._iCloud.status;
	}

	async preloadData() {
		//console.log("preloading data: waiting for iCloud status");
		await this._iCloud.awaitReady;
		console.log("preloading data...");
		//console.log("Fetching events!");
		this._calendarService = this._iCloud.getService("calendar");
		this._calendars = await this._calendarService.calendars();
		this._dataLoadingComplete = true;
		console.log("preloading data: Done");
		console.log(this._calendars);
	}

	async pushEvent(event: Event): Promise<boolean>{
		console.log("Pushing event!");
		// TODO
		// Implement, all day
		const calendar = this._calendars.first();
		event.injectICloudComponents({
			tz: "Europe/Rome",
			pGuid: calendar.guid
		})
		const postStatus = await this._calendarService.postEvent(event.value, calendar.ctag);
		console.log(postStatus);
		return postStatus;
	}

	/*
	fetchTags(app: App){
		const files = app.vault.getFiles();
		files.forEach((file) => {
			const fileCache = app.metadataCache.getFileCache(file)
			const fileTags = getAllTags(fileCache);
			const filteredTags = fileTags.filter(tag => this.checkRegex(tag));
			filteredTags.forEach(async filteredTag => {
				this._nplC.process(await app.vault.read(file));
				const event = new Event(filteredTag.toString());
				event.linkFile(new SimplifiedFile(file.name, file.path))
				this.updateHashTable(event);
			});
		});
		this.updateLocalTagStorage();
		//this.manageSync(this);
	}

	 */

	// Why a local storage?
	// I need to keep track of the tags already synced
	// Periodically the local storage will be checked in order to sync
	// the remaining tags

	getLocalStorageTags(): Map<number, boolean> {
		//console.log("getting local storage tags");
		try{
			const data = readFileSync(this._pluginPath + "/.events.txt").toString('utf-8')
			const lines = data.split("\n");
			const tagMap = new Map<number, boolean>();
			lines.forEach(line => {
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
				//console.log("No tags file found: Creating one")
				writeFileSync(this._pluginPath + "/.tags.txt", "");
			}
			return new Map<number, boolean>();
		}
	}


	updateLocalTagStorage(){
		const tagMap = this.getLocalStorageTags();
		//console.log("Found these tags:")
		//console.log(JSON.stringify(Array.from(tagMap.entries())));
		const writeStream = createWriteStream(this._pluginPath + "/.tags.txt", {flags: 'a'});
		Array.from(this._tagHash.entries()).forEach((entry) => {
			const hash = entry[0];
			if(!tagMap.has(hash)){
				const newLine = `${hash} false\n`
				//console.log(`New tag in local store!    ${newLine}`);
				writeStream.write(newLine);
				this._pendingTagsBuffer.push(Number(hash));
			}
		})
		writeStream.close();
		//console.log("current buffer status");
		console.log(this._pendingTagsBuffer);
	}

	// Why the hash table?
	// The same iCal tag can be placed among different files and I'd need to travers
	// the whole tag structure to find if the new tag found is already in the structure (possibly multiple times)
	// With a hash table I can easily check in O(1)
	updateHashTable(tag: Event) {
		this._tagHash.set(tag.hash, tag);
	}

	getMaterial(material: string) : string {
		return readFileSync(`${this._pluginPath}/materials/${material}`).toString();
	}
}
