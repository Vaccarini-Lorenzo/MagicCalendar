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

export class GoogleCalendarController implements CloudController {
	private _pluginPath: string;
	private readonly _scopes: string[];
	private _calendarEndpoint: APIEndpoint;
	private _calendars: GoogleCalendar[];
	private _currentCalendar: GoogleCalendar;
	private _settings: SettingInterface;

	constructor() {
		console.log("constructor");
		this._scopes = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"];
		this._calendars = [];
	}

	async pushEvent(cloudEvent: CloudEvent): Promise<boolean>{
		const googleEventInsertResponse = await this._calendarEndpoint.events.insert({
			calendarId: this._currentCalendar.summary,
			resource: cloudEvent as GoogleCalendarEvent
		})
		return googleEventInsertResponse.status == 200;
	}

	async updateEvent(cloudEvent: CloudEvent, updateMap: Map<string, string>): Promise<boolean>{
		return true;
	}

	async getEvents(missedDateRange: DateRange): Promise<CloudEvent[]> {
		const googleEventResponse = await this._calendarEndpoint.events.list({
			calendarId: this._currentCalendar.summary,
			orderBy: "startTime",
			singleEvents: true,
			timeMax: missedDateRange.end.toISOString(),
			timeMin: missedDateRange.start.toISOString()
		});

		const googleEvents = googleEventResponse.data.items as GoogleCalendarEvent[];

		googleEvents.forEach(googleEvent => {
			googleEvent.cloudEventUUID = googleEvent.id;
			googleEvent.cloudEventTitle = googleEvent.summary;
			googleEvent.cloudEventStartDate = new Date(googleEvent.start.dateTime);
			googleEvent.cloudEventEndDate = new Date(googleEvent.end.dateTime);
		})

		return googleEvents;
	}

	injectPath(pluginPath: string) {
		this._pluginPath = pluginPath;
	}

	injectSettings(settings: SettingInterface) {
		console.log("settings", settings);
		this._settings = settings;
		console.log("this settings", this._settings.calendar);
		console.log("this calendars", this._calendars);
		this._currentCalendar = this._calendars.filter(calendar => {
			return calendar.summary == this._settings.calendar;
		}).first();
		console.log("_currentCalendar", this._currentCalendar);

	}

	async tryAuthentication(auth: Map<string,string>): Promise<CloudStatus> {
		if (auth){
			return await this.manageTokenValidity(auth);
		}
		/*
		const oAuth2Client = await authenticate({
			scopes: this._scopes,
			keyfilePath: this._credentialsPath,
		});
		*/
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
		console.log("preloading data");
		const calendarResponse = await this._calendarEndpoint.calendarList.list();
		console.log(calendarResponse);
		this._calendars = calendarResponse.data.items as GoogleCalendar[];
		this._currentCalendar = this._calendars.first();
		console.log("this PRELOADED calendars", this._calendars);
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
