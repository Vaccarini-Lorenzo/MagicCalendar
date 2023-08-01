import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import iCloudService from "./index";
import Misc from "./misc";
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

interface iCloudCalendarCollection {
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
    
    private async executeRequest<T = any>(endpointUrl: string, params: Record<string, string>, method?: string, body?: object, extraHeaders?: Record<string, string>): Promise<T> {
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

        const response = await Misc.wrapRequest(url, requestParameters);
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

    async postEvent(newEvent: iCloudCalendarEvent, associatedCalendar: iCloudCalendarCollection){
        const url = `/events/${newEvent.pGuid}/${newEvent.guid}`;
        const queryParams = this.getQueryParams(newEvent);
        const extraHeaders = {
            "Connection": "keep-alive",
            "Referer": "https://www.icloud.com/"
        }
        const body = this.getBody(newEvent, associatedCalendar);

        await this.executeRequest(url, queryParams, "POST", body, extraHeaders);
    }

    private getQueryParams(event: iCloudCalendarEvent): Record<string, string> {
        const stringifiedStartDate = Misc.stringifyDateArray(event.startDate);
        const stringifiedEndDate = Misc.stringifyDateArray(event.endDate);
        return {
            "dsid": this.dsid,
            "startDate": stringifiedStartDate,
            "endDate": stringifiedEndDate,
            "usertz": event.tz
        }
    }

    private getBody(newEvent: iCloudCalendarEvent, associatedCalendar: iCloudCalendarCollection): object {
        return {
            Event: newEvent,
            ClientState: {
                Collection: [
                    {
                        guid: newEvent.pGuid,
                        ctag: associatedCalendar.ctag
                    }
                ],
                fullState: false,
                userTime: 1234567890,
                alarmRange: 60
            }
        }
    }

    // Minimal version
    createNewEvent(tz: string, title: string, duration: number, pGuid: string, startDate: Date, endDate: Date): iCloudCalendarEvent {
        const arrayStartDate = Misc.getArrayDate(startDate);
        const arrayEndDate = Misc.getArrayDate(endDate);
        const guid = this.generateNewUUID();

        return {
            tz,
            title,
            duration,
            pGuid,
            guid,
            startDate: arrayStartDate,
            endDate: arrayEndDate,
            localStartDate: arrayStartDate,
            localEndDate: arrayEndDate,
            extendedDetailsAreIncluded: true,
            allDay: false,
            isJunk: false,
            recurrenceMaster: false,
            recurrenceException: false,
            hasAttachments: false
        } as iCloudCalendarEvent;
    }

    private generateNewUUID(): string {
        const maxIntEightNibbles = 4294967295;
        const maxIntFourNibbles = 65535;
        const maxIntTwelveNibbles = 281474976710655;
        const firstUUID = Misc.getRandomHex(maxIntEightNibbles);
        const secondUUID = Misc.getRandomHex(maxIntFourNibbles);
        const thirdUUID = Misc.getRandomHex(maxIntFourNibbles);
        const fourthUUID = Misc.getRandomHex(maxIntFourNibbles);
        const lastUUID = Misc.getRandomHex(maxIntTwelveNibbles);
        return `${firstUUID}-${secondUUID}-${thirdUUID}-${fourthUUID}-${lastUUID}`
    }

}