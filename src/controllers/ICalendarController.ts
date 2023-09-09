import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import Event from "../model/event";
import {iCloudCalendarCollection, iCloudCalendarEvent} from "../model/events/iCloudCalendarEvent"
import {SettingInterface} from "../plugin/appSetting";
import {DateRange} from "../model/dateRange";
import {iCloudCalendarService} from "../iCloudJs/calendar";
import {CloudController} from "./cloudController";
import {CloudEvent} from "../model/events/cloudEvent";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {Misc} from "../misc/misc";
import {RequestUrlParam} from "obsidian";
import calendarViewController from "./calendarViewController";

export class ICalendarController implements CloudController {
	private _iCloud: iCloudService;
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

	async tryAuthentication(auth: Map<string,string>): Promise<CloudStatus>{
		this._iCloud = new iCloudService({
			username: auth.get("iCalSyncUsername"),
			password: auth.get("iCalSyncPassword"),
			saveCredentials: true,
			trustDevice: true
		});
		try {
			await this._iCloud.authenticate();
			return this.convertToCloudStatus(this._iCloud.status);
		} catch (e) {
			console.warn("Error during authentication");
			console.warn(e.message);
			return this.convertToCloudStatus(iCloudServiceStatus.Error);
		}
	}

	async MFACallback(mfa: string): Promise<CloudStatus> {
		try{
			await this._iCloud.provideMfaCode(mfa);
			await this._iCloud.awaitReady;
			return this.convertToCloudStatus(this._iCloud.status);
		} catch (e) {
			console.warn(e);
			return CloudStatus.ERROR;
		}
	}

	async preloadData() {
		await this._iCloud.awaitReady;
		this._calendarService = this._iCloud.getService("calendar");
		this._calendars = await this._calendarService.calendars();
		this._dataLoadingComplete = true;
	}

	async pushEvent(event: Event): Promise<boolean>{
		let calendar = this._calendars.first();
		const iCloudEvent = event.value as iCloudCalendarEvent;
		if (this.appSettings.calendar != "Log in to select a calendar"){
			const firstMatchingCalendar = this._calendars.filter(calendar => calendar.title == this.appSettings.calendar)[0];
			calendar = firstMatchingCalendar ?? calendar;
		}

		iCloudEvent.tz = this.appSettings.tz;
		iCloudEvent.pGuid = calendar.guid;

		return await this._calendarService.postEvent(iCloudEvent, calendar.ctag);
	}

	async awaitReady(){
		await this._iCloud.awaitReady;
	}

	isLoggedIn(){
		return this._iCloud != undefined && (this._iCloud.status == iCloudServiceStatus.Ready || this._iCloud.status == iCloudServiceStatus.Trusted)
	}

	async getEvents(missedDateRange: DateRange): Promise<CloudEvent[]> {
		if (this._calendarService == undefined) return [];
		const iCloudEvents = await this._calendarService.events(missedDateRange.start, missedDateRange.end);
		iCloudEvents.forEach(iCloudEvent => {
			iCloudEvent.cloudEventUUID = iCloudEvent.pGuid;
			iCloudEvent.cloudEventTitle = iCloudEvent.title;
			iCloudEvent.cloudEventStartDate = Misc.getDateFromICloudArray(iCloudEvent.startDate);
			iCloudEvent.cloudEventEndDate = Misc.getDateFromICloudArray(iCloudEvent.endDate);
		});
		return iCloudEvents;
	}

	refreshRequestCookies(requestUrlParams: RequestUrlParam){
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

	private convertToCloudStatus(status: iCloudServiceStatus): CloudStatus {
		if (status == iCloudServiceStatus.NotStarted) return CloudStatus.NOT_STARTED;
		if (status == iCloudServiceStatus.Error) return CloudStatus.ERROR;
		if (status == iCloudServiceStatus.MfaRequested) return CloudStatus.MFA_REQ;
		if (status == iCloudServiceStatus.Started) return CloudStatus.WAITING;
		if (status == iCloudServiceStatus.Authenticated || status == iCloudServiceStatus.Ready || status == iCloudServiceStatus.Trusted ) return CloudStatus.LOGGED;
		return undefined;
	}

	async manageAPNS() {
		try {
			await this.awaitReady();
			await this._iCloud.getAPNSToken();
			await this._iCloud.registerAPNSToken();
			await this._iCloud.startAPNS(() => {
				calendarViewController.postProcessorUpdate()
			});
		} catch (e) {
			console.warn("Something went wrong managing APNS", e);
		}
	}
}
