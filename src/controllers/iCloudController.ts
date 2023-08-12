import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import Event from "../model/event";
import {iCloudCalendarCollection, iCloudCalendarService} from "../iCloudJs/calendar";
import {SettingInterface} from "../plugin/appSetting";

class ICloudController {
	private _iCloud: iCloudService;
	private _pendingTagsBuffer: number[];
	private _pluginPath: string;
	private _calendars: iCloudCalendarCollection[];
	private _calendarService: iCloudCalendarService;
	private _tagHash: Map<number, Event>;
	private _dataLoadingComplete: boolean;
	private appSettings: SettingInterface;

	constructor() {
		this._tagHash = new Map<number, Event>();
		this._pendingTagsBuffer = [];
		this._calendars = [];
		this._dataLoadingComplete = false;
	}

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
	}

	injectSettings(appSettings: SettingInterface){
		this.appSettings = appSettings;
	}

	getCalendarNames(): string[]{
		return this._calendars.map(calendar => calendar.title);
	}

	async tryAuthentication(username: string, password: string): Promise<iCloudServiceStatus>{
		this._iCloud = new iCloudService({
			username,
			password,
			saveCredentials: true,
			trustDevice: true
		});
		await this._iCloud.authenticate();
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
	}

	async pushEvent(event: Event): Promise<boolean>{
		console.log("Pushing event!");
		let calendar = this._calendars.first();
		if (this.appSettings.calendar != "Log in to select a calendar"){
			const firstMatchingCalendar = this._calendars.filter(calendar => calendar.title == this.appSettings.calendar)[0];
			calendar = firstMatchingCalendar ?? calendar;
			console.log(calendar);
		}
		event.injectICloudComponents({
			tz: this.appSettings.tz,
			pGuid: calendar.guid
		})
		return await this._calendarService.postEvent(event.value, calendar.ctag);
	}
}

const iCloudController = new ICloudController();
export default iCloudController;
