import iCloudService from "./index";
import iCloudMisc from "./iCloudMisc";
import {Notice} from "obsidian";
import moment from "moment-timezone";
import dayjs from "dayjs";
import {
	iCloudCalendarEvent,
	iCloudCalendarEventDetailResponse,
	iCloudCalendarEventsResponse,
	iCloudCalendarStartupResponse
} from "../model/events/iCloudCalendarEvent";

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
        }

        const response = await iCloudMisc.wrapRequest(url, requestParameters);
		if (onlyResponseStatus) return response.status;
		return await response.json() as T;
    }

    async eventDetails(calendarGuid: string, eventGuid: string) {
        const response = await this.executeRequest<iCloudCalendarEventDetailResponse>(`/eventdetail/${calendarGuid}/${eventGuid}`, {
            lang: "en-us",
            usertz: moment.tz.guess(),
            dsid: this.dsid
        });

        return response.Event[0];
    }


	async getRangeData(){
		const response = await this.executeRequest<iCloudCalendarStartupResponse>("/startup", {
			startDate: dayjs(dayjs().startOf("month")).format(this.dateFormat),
			endDate: dayjs(dayjs().endOf("month")).format(this.dateFormat),
			dsid: this.dsid,
			lang: "en-us",
			usertz: moment.tz.guess(),
		});

		return {
			calendars: response.Collection || [],
			events: response.Event || []
		};
	}

    async events(from?: Date, to?: Date) {
        const response = await this.executeRequest<iCloudCalendarEventsResponse>("/events", {
            startDate: dayjs(from ?? dayjs().startOf("month")).format(this.dateFormat),
            endDate: dayjs(to ?? dayjs().endOf("month")).format(this.dateFormat),
            dsid: this.dsid,
            lang: "en-us",
            usertz: moment.tz.guess(),
        });
        return response.Event || [];
    }

    async calendars() {
        const response = await this.executeRequest<iCloudCalendarStartupResponse>("/startup", {
            startDate: dayjs(dayjs().startOf("month")).format(this.dateFormat),
            endDate: dayjs(dayjs().endOf("month")).format(this.dateFormat),
            dsid: this.dsid,
            lang: "en-us",
            usertz: moment.tz.guess(),
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
        const requestStatus = await this.executeRequest(url, queryParams, "POST", body, extraHeaders, true);
		if (requestStatus == 421){
			new Notice("Refreshing tokens...");
			//await iCloudController.tryAuthentication("", "");
			//return await this.postEvent(newEvent, calendarCTag);
		}
		return (requestStatus < 300 && requestStatus >= 200);

    }

    private getQueryParams(event: iCloudCalendarEvent): Record<string, string> {
        const stringifiedStartDate = iCloudMisc.stringifyDateArray(event.startDate);
        const stringifiedEndDate = iCloudMisc.stringifyDateArray(event.endDate);
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
