import {CloudController} from "./cloudController";
import {SettingInterface} from "../plugin/appSetting";
import {DateRange} from "../model/dateRange";
import {CloudEvent} from "../model/events/cloudEvent";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {authenticate} from "@google-cloud/local-auth";
import {join} from "path";
import Event from "../model/event";

// If modifying these scopes, delete token.json.

export class GoogleCalendarController extends CloudController {
	pluginPath: string;
	credentialsPath: string;
	scopes: string[];

	constructor() {
		super();
		this.scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
	}

	async pushEvent(event: Event): Promise<boolean>{return false;}

	async getEvents(missedDateRange: DateRange): Promise<CloudEvent[]> {return [];}

	injectPath(pluginPath: string) {
		this.pluginPath = pluginPath;
		this.credentialsPath = join(pluginPath, '.googleOAuthCredentials.json');
	}

	injectSettings(settings: SettingInterface) {}

	async tryAuthentication(auth: any): Promise<CloudStatus> {
		console.log(this.credentialsPath);
		const oAuth2Client = await authenticate({
			scopes: this.scopes,
			keyfilePath: this.credentialsPath,
		});
		if (oAuth2Client.credentials) {
			console.log("Logged in: Here's the returned object");
			console.log(oAuth2Client);
			// This stuff has to be saved in localStorage
			/*
			{
    			"access_token": "",
    			"refresh_token": "",
    			"scope": "https://www.googleapis.com/auth/calendar.readonly",
    			"token_type": "Bearer",
    			"expiry_date":
    		}
			 */
			return CloudStatus.LOGGED;
		}
		return CloudStatus.ERROR;
	}

	async MFACallback(code: string): Promise<CloudStatus> {return CloudStatus.ERROR;}

	async preloadData() {}

	getCalendarNames() {return [];}
}
