import {CloudController} from "./cloudController";
import {DateRange} from "../model/dateRange";
import {CloudEvent} from "../model/events/cloudEvent";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {OAuth2Client} from "google-auth-library";
import safeController from "./safeController";
import {google} from "googleapis";
import {APIEndpoint} from "googleapis-common";
import {GoogleCalendar} from "../model/cloudCalendar/googleCalendar";
import {GoogleCalendarEvent} from "../model/events/googleCalendarEvent";
import {SettingInterface} from "../plugin/appSetting";
import {GoogleAuthenticator} from "./googleAuthenticator";
import {Misc} from "../misc/misc";
import calendarViewController from "./calendarViewController";
import {calendar} from "googleapis/build/src/apis/calendar";

export class GoogleCalendarController implements CloudController {
	private _pluginPath: string;
	private readonly _scopes: string[];
	private _calendarEndpoint: APIEndpoint;
	private _calendars: GoogleCalendar[];
	private _currentCalendarName: string;
	private _currentCalendarId: string;
	private _settings: SettingInterface;
	private _channelId: string;

	constructor() {
		this._scopes = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"];
		this._calendars = [];
		this._channelId = Misc.generateGoogleCloudUUID();
	}

	async managePushNotifications(){
	}

	async pushEvent(cloudEvent: CloudEvent): Promise<boolean>{
		const googleEventInsertResponse = await this._calendarEndpoint.events.insert({
			calendarId: this._currentCalendarName,
			resource: cloudEvent as GoogleCalendarEvent
		})
		return googleEventInsertResponse.status == 200;
	}

	async updateEvent(cloudEvent: CloudEvent): Promise<boolean>{
		const googleEventInsertResponse = await this._calendarEndpoint.events.patch({
			calendarId: this._currentCalendarName,
			eventId: (cloudEvent as GoogleCalendarEvent).id,
			resource: cloudEvent as GoogleCalendarEvent
		})
		calendarViewController.postProcessorUpdate();
		return googleEventInsertResponse.status == 200;
	}

	async getEvents(missedDateRange: DateRange): Promise<CloudEvent[]> {
		const googleEventResponse = await this._calendarEndpoint.events.list({
			calendarId: this._currentCalendarId,
			orderBy: "startTime",
			singleEvents: true,
			timeMax: missedDateRange.end.toISOString(),
			timeMin: missedDateRange.start.toISOString()
		});

		const googleEvents = googleEventResponse.data.items as GoogleCalendarEvent[];

		googleEvents.forEach(googleEvent => {
			const cloudEventStartDate = googleEvent.start.dateTime ? new Date(googleEvent.start.dateTime) : new Date(googleEvent.start.date + " 00:00");
			const cloudEventEndDate = googleEvent.end.dateTime ? new Date(googleEvent.end.dateTime) : new Date(googleEvent.end.date + " 23:59");

			googleEvent.cloudEventUUID = googleEvent.id;
			googleEvent.cloudEventTitle = googleEvent.summary;
			googleEvent.cloudEventStartDate = cloudEventStartDate
			googleEvent.cloudEventEndDate = cloudEventEndDate
		})

		return googleEvents;
	}

	injectPath(pluginPath: string) {
		this._pluginPath = pluginPath;
	}

	injectSettings(settings: SettingInterface) {
		this._settings = settings;
		if (this._calendars.length == 0){
			this._currentCalendarName = this._settings.calendar;
			return;
		}
		this._currentCalendarName = this._calendars.filter(calendar => {
			return calendar.summary == this._settings.calendar;
		}).first().summary;
		const currentCalendar = this._calendars.filter(calendar => calendar.summary == this._currentCalendarName).first();
		if (currentCalendar) this._currentCalendarId = currentCalendar.id;
		else console.warn("Could not inject settings: Current calendar not found");
	}

	async tryAuthentication(auth: Map<string,string>): Promise<CloudStatus> {
		//await this._calendarEndpoint.events.watch();
		if (auth){
			return await this.manageTokenValidity(auth);
		}
		const googleAuthenticator = new GoogleAuthenticator(this._scopes);
		const oAuth2Client = await googleAuthenticator.authenticate();
		if (oAuth2Client.credentials) {
			const credentialMap = new Map<string, string>();
			credentialMap.set("clientId", oAuth2Client._clientId);
			credentialMap.set("clientSecret", oAuth2Client._clientSecret);
			credentialMap.set("refreshToken", oAuth2Client.credentials.refresh_token);
			credentialMap.set("tokenType", "authorized_user");
			credentialMap.set("accessToken", oAuth2Client.credentials.access_token);

			safeController.storeCredentials(credentialMap);
			this._calendarEndpoint = google.calendar({version: 'v3', auth: oAuth2Client});
			return CloudStatus.LOGGED;
		}
		return CloudStatus.ERROR;
	}

	async preloadData() {
		const calendarResponse = await this._calendarEndpoint.calendarList.list();
		this._calendars = calendarResponse.data.items as GoogleCalendar[];
		if (!this._currentCalendarName) return;
		const currentCalendar = this._calendars.filter(calendar => calendar.summary == this._currentCalendarName).first();
		if (currentCalendar) this._currentCalendarId = currentCalendar.id;
		else console.warn("Couldn't find current calendar");
	}

	getCalendarNames() {
		return this._calendars.map(calendar => calendar.summary);
	}

	private async manageTokenValidity(auth: Map<string, string>) {
		const tokenType = auth.get("tokenType");
		const clientId = auth.get("clientId");
		const clientSecret = auth.get("clientSecret");
		const refreshToken = auth.get("refreshToken");
		try {
			const oAuth2Client = google.auth.fromJSON({type: tokenType, client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken}) as OAuth2Client;
			this._calendarEndpoint = google.calendar({version: 'v3', auth: oAuth2Client});
			if (oAuth2Client.credentials) return CloudStatus.LOGGED;
			return CloudStatus.ERROR;
		} catch (e){
			console.warn("Error refreshing the token", e);
			return CloudStatus.ERROR;
		}
	}
}
