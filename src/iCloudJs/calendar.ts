import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import iCloudService from "./index";
import iCloudMisc from "./iCloudMisc";
import iCloudController from "../controllers/iCloudController";
import {Notice} from "obsidian";
dayjs.extend(utc);
dayjs.extend(timezone);

interface iCloudCalendarAlarm {
  messageType: string;
  pGuid: string;
  guid: string;
  isLocationBased: boolean;
  measurement: {
    hours: number;
    seconds: number;
    weeks: number;
    minutes: number;
    days: number;
    before: boolean;
  }
}

export interface iCloudCalendarEvent {
  tz: string;
  icon: number;
  recurrenceException: boolean;
  title: string;
  tzname: string;
  duration: number;
  allDay: boolean;
  startDateTZOffset: string;
  pGuid: string;
  hasAttachments: boolean;
  birthdayIsYearlessBday: boolean;
  alarms: string[];
  lastModifiedDate: number[];
  readOnly: boolean;
  localEndDate: number[];
  recurrence: string;
  localStartDate: number[];
  createdDate: number[];
  extendedDetailsAreIncluded: boolean;
  guid: string;
  etag: string;
  startDate: number[];
  endDate: number[];
  birthdayShowAsCompany: boolean;
  recurrenceMaster: boolean;
  attachments: any[];
  shouldShowJunkUIWhenAppropriate: boolean;
  url: string;
  isJunk: boolean;
  description: string;
  location: string;
  changeRecurring: string | null;
}

interface iCloudCalendarRecurrence {
  guid: string;
  pGuid: string;
  freq: string;
  interval: number;
  recurrenceMasterStartDate: any[];
  weekStart: string;
  frequencyDays: string;
  weekDays: any[];
}

interface iCloudCalendarInvitee {
  commonName: string;
  isMe: boolean;
  isOrganizer: boolean;
  inviteeStatus: string;
  pGuid: string;
  guid: string;
  isSenderMe: boolean;
  email: string;
  cutype: string;
}

export interface iCloudCalendarCollection {
  title: string;
  guid: string;
  ctag: string;
  order: number;
  color: string;
  symbolicColor: string;
  enabled: boolean;
  createdDate: number[];
  isFamily: boolean;
  lastModifiedDate: number[];
  shareTitle: string;
  prePublishedUrl: string;
  supportedType: string;
  etag: string;
  isDefault: boolean;
  objectType: string;
  readOnly: boolean;
  isPublished: boolean;
  isPrivatelyShared: boolean;
  extendedDetailsAreIncluded: boolean;
  shouldShowJunkUIWhenAppropriate: boolean;
  publishedUrl: string;
}

interface iCloudCalendarEventDetailResponse {
  Alarm: Array<iCloudCalendarAlarm>;
  Event: Array<iCloudCalendarEvent>;
  Invitee: Array<iCloudCalendarInvitee>;
  Recurrence: Array<iCloudCalendarRecurrence>;
}

interface iCloudCalendarStartupResponse {
  Alarm: Array<iCloudCalendarAlarm>,
  Event: Array<iCloudCalendarEvent>,
  Collection: Array<iCloudCalendarCollection>
}

interface iCloudCalendarEventsResponse {
  Alarm: Array<iCloudCalendarAlarm>;
  Event: Array<iCloudCalendarEvent>;
  Recurrence: Array<iCloudCalendarRecurrence>;
}

export class iCloudCalendarService {
    service: iCloudService;
    serviceUri: string;
    dsid: string;
    dateFormat = "YYYY-MM-DD";
    calendarServiceUri: string;
    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        this.dsid = this.service.accountInfo.dsInfo.dsid;
        this.calendarServiceUri = `${service.accountInfo.webservices.calendar.url}/ca`;
    }
    
    private async executeRequest<T = any>(endpointUrl: string, params: Record<string, string>, method?: string, body?: object, extraHeaders?: Record<string, string>, onlyResponseStatus?: boolean): Promise<any> {
        method = method ?? "GET";
        const searchParams = decodeURI(`${new URLSearchParams(params ?? [])}`);
        const url = `${this.calendarServiceUri}${endpointUrl}?${searchParams}`;

        const requestParameters = {
            method: method,
            headers: {
                ...this.service.authStore.getHeaders(),
                ...extraHeaders,
                Referer: "https://www.icloud.com/",
				mode: "no-cors"
            },
        }

        if (method == "POST" && body != undefined){
            requestParameters["body"] = JSON.stringify(body);
            /*
            console.log(`url: ${url}`);
            console.log(`-H 'Cookie: ${requestParameters.headers.Cookie}'`);
            console.log(`-H 'Referer: ${requestParameters.headers.Referer}'`);
            console.log(`-H 'Accept: ${requestParameters.headers.Accept}'`);
            console.log(`-H 'Origin: ${requestParameters.headers.Origin}'`);
            console.log(`-H 'User-Agent: ${requestParameters.headers["User-Agent"]}'`);
            console.log(`-H 'Content-Type: ${requestParameters.headers["Content-Type"]}'`);
            console.log(JSON.stringify(body));
             */
        }

        const response = await iCloudMisc.wrapRequest(url, requestParameters);
		if (onlyResponseStatus) return response.status;
        return await response.json() as T;
    }

    async eventDetails(calendarGuid: string, eventGuid: string) {
        const response = await this.executeRequest<iCloudCalendarEventDetailResponse>(`/eventdetail/${calendarGuid}/${eventGuid}`, {
            lang: "en-us",
            usertz: dayjs.tz.guess(),
            dsid: this.dsid
        });

        return response.Event[0];
    }
    async events(from?: Date, to?: Date) {
        const response = await this.executeRequest<iCloudCalendarEventsResponse>("/events", {
            startDate: dayjs(from ?? dayjs().startOf("month")).format(this.dateFormat),
            endDate: dayjs(to ?? dayjs().endOf("month")).format(this.dateFormat),
            dsid: this.dsid,
            lang: "en-us",
            usertz: dayjs.tz.guess()
        });

        return response.Event || [];
    }
    async calendars() {
        const response = await this.executeRequest<iCloudCalendarStartupResponse>("/startup", {
            startDate: dayjs(dayjs().startOf("month")).format(this.dateFormat),
            endDate: dayjs(dayjs().endOf("month")).format(this.dateFormat),
            dsid: this.dsid,
            lang: "en-us",
            usertz: dayjs.tz.guess()
        });

        return response.Collection || [];
    }

    async postEvent(newEvent: iCloudCalendarEvent, calendarCTag: string): Promise<boolean>{
        const url = `/events/${newEvent.pGuid}/${newEvent.guid}`;
        const queryParams = this.getQueryParams(newEvent);
        const extraHeaders = {
            "Connection": "keep-alive",
            "Referer": "https://www.icloud.com/"
        }
        const body = this.getBody(newEvent, calendarCTag);
		console.log(body);
        const requestStatus = await this.executeRequest(url, queryParams, "POST", body, extraHeaders, true);
		if (requestStatus == 421){
			new Notice("Refreshing tokens...");
			await iCloudController.tryAuthentication("", "");
			await this.postEvent(newEvent, calendarCTag);
		}
		return (requestStatus < 300 && requestStatus >= 200);

    }

    private getQueryParams(event: iCloudCalendarEvent): Record<string, string> {
        const stringifiedStartDate = iCloudMisc.stringifyDateArray(event.startDate);
        const stringifiedEndDate = iCloudMisc.stringifyDateArray(event.endDate);
		console.log("DSID = ", this.dsid);
        return {
            "dsid": this.dsid,
            "startDate": stringifiedStartDate,
            "endDate": stringifiedEndDate,
            "usertz": event.tz
        }
    }

    private getBody(newEvent: iCloudCalendarEvent, calendarCTag: string): object {
        return {
            Event: newEvent,
            ClientState: {
                Collection: [
                    {
                        guid: newEvent.pGuid,
                        ctag: calendarCTag
                    }
                ],
                fullState: false,
                userTime: 1234567890,
                alarmRange: 60
            }
        }
    }

}
