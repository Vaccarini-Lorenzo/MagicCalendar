import {CloudController} from "./cloudController";
import {SettingInterface} from "../plugin/appSetting";
import {DateRange} from "../model/dateRange";
import {CloudEvent} from "../model/events/cloudEvent";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {authenticate} from "@google-cloud/local-auth";
import {OAuth2Client} from "google-auth-library";
import {join} from "path";
import Event from "../model/event";
import safeController from "./safeController";
import {google} from "googleapis";
import {APIEndpoint} from "googleapis-common";
import {GoogleCalendar} from "../model/cloudCalendar/googleCalendar";
import {GoogleCalendarEvent} from "../model/events/googleCalendarEvent";

export class GoogleCalendarController extends CloudController {
	private _pluginPath: string;
	private _credentialsPath: string;
	private _scopes: string[];
	private _calendarEndpoint: APIEndpoint;
	private _calendars: GoogleCalendar[];

	constructor() {
		super();
		this._scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
	}

	async pushEvent(event: Event): Promise<boolean>{return false;}

	async getEvents(missedDateRange: DateRange): Promise<CloudEvent[]> {
		const googleEventResponse = await this._calendarEndpoint.events.list({
			calendarId: "primary",
			orderBy: "startTime",
			singleEvents: true,
			timeMax: missedDateRange.end.toISOString(),
			timeMin: missedDateRange.start.toISOString()
		});
		console.log(googleEventResponse);
		const googleEvents = googleEventResponse.data.items as GoogleCalendarEvent[];
		console.log(googleEvents);
		console.log(missedDateRange);

		googleEvents.forEach(googleEvent => {
			googleEvent.cloudUUID = googleEvent.id;
			googleEvent.cloudEventTitle = googleEvent.summary;
			googleEvent.cloudEventStartDate = new Date(googleEvent.start.dateTime);
			googleEvent.cloudEventEndDate = new Date(googleEvent.end.dateTime);
		})

		console.log(googleEvents);

		return googleEvents;
	}

	injectPath(pluginPath: string) {
		this._pluginPath = pluginPath;
		this._credentialsPath = join(pluginPath, '.googleOAuthCredentials.json');
	}

	injectSettings(settings: SettingInterface) {

	}

	async tryAuthentication(auth: Map<string,string>): Promise<CloudStatus> {
		if (auth){
			return await this.manageTokenValidity(auth);
		}
		const oAuth2Client = await authenticate({
			scopes: this._scopes,
			keyfilePath: this._credentialsPath,
		});
		if (oAuth2Client.credentials) {
			console.log(oAuth2Client);
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
		console.log("calendarResponse", calendarResponse);
		this._calendars = calendarResponse.data.items as GoogleCalendar[];
	}

	getCalendarNames() {
		return this._calendars.map(calendar => calendar.summary);
	}

	private async manageTokenValidity(auth: Map<string, string>) {
		const tokenType = auth.get("tokenType");
		const clientId = auth.get("clientId");
		const clientSecret = auth.get("clientSecret");
		const refreshToken = auth.get("refreshToken");
		console.log(tokenType);
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
