import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import Event from "../model/event";
import {iCloudCalendarCollection, iCloudCalendarEvent, iCloudCalendarService} from "../iCloudJs/calendar";
import {SettingInterface} from "../plugin/appSetting";
import {DateRange} from "../model/dateRange";

class ICloudController {
	private _iCloud: iCloudService;
	private _pendingTagsBuffer: number[];
	private _pluginPath: string;
	private _calendars: iCloudCalendarCollection[];
	private _calendarService: iCloudCalendarService;
	private _tagHash: Map<number, Event>;
	private _dataLoadingComplete: boolean;
	private appSettings: SettingInterface;
	private maxReconnectAttempt: number;
	private reconnectAttempt: number;

	constructor() {
		this._tagHash = new Map<number, Event>();
		this._pendingTagsBuffer = [];
		this._calendars = [];
		this._dataLoadingComplete = false;
		this.maxReconnectAttempt = 5;
		this.reconnectAttempt = 0;
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
		try {
			await this._iCloud.authenticate();
			return this._iCloud.status;
		} catch (e) {
			console.warn("Error during authentication");
			console.warn(e.message);
			return iCloudServiceStatus.Error;
		}
	}

	async MFACallback(mfa: string): Promise<iCloudServiceStatus> {
		await this._iCloud.provideMfaCode(mfa);
		await this._iCloud.awaitReady;
		return this._iCloud.status;
	}

	async preloadData() {
		await this._iCloud.awaitReady;
		this._calendarService = this._iCloud.getService("calendar");
		this._calendars = await this._calendarService.calendars();
		this._dataLoadingComplete = true;
	}

	async pushEvent(event: Event): Promise<boolean>{
		let calendar = this._calendars.first();
		if (this.appSettings.calendar != "Log in to select a calendar"){
			const firstMatchingCalendar = this._calendars.filter(calendar => calendar.title == this.appSettings.calendar)[0];
			calendar = firstMatchingCalendar ?? calendar;
		}
		event.injectICloudComponents({
			tz: this.appSettings.tz,
			pGuid: calendar.guid
		})
		return await this._calendarService.postEvent(event.value, calendar.ctag);
	}

	async awaitReady(){
		await this._iCloud.awaitReady;
	}

	isLoggedIn(){
		return this._iCloud != undefined && (this._iCloud.status == iCloudServiceStatus.Ready || this._iCloud.status == iCloudServiceStatus.Trusted)
	}

	async getICloudEvents(missedDateRange: DateRange): Promise<iCloudCalendarEvent[]> {
		if (this._calendarService == undefined) return [];
		return await this._calendarService.events(missedDateRange.start, missedDateRange.end);
	}

	refreshRequestCookies(requestUrlParams: { url, method, headers, body }){
		const oldHeader = requestUrlParams.headers;
		oldHeader.Cookie = this._iCloud.authStore.getHeaders().Cookie;
		return;
	}

	checkMaxReconnectAttempt(): boolean{
		this.reconnectAttempt += 1;
		return this.reconnectAttempt < this.maxReconnectAttempt;
	}

	resetReconnectAttempt() {
		this.reconnectAttempt = 0;
	}
}

const iCloudController = new ICloudController();
export default iCloudController;
