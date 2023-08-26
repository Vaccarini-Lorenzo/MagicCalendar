import {CloudEvent} from "./cloudEvent";

export class iCloudCalendarEvent extends CloudEvent {
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

export interface iCloudCalendarAlarm {
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


export interface iCloudCalendarRecurrence {
	guid: string;
	pGuid: string;
	freq: string;
	interval: number;
	recurrenceMasterStartDate: any[];
	weekStart: string;
	frequencyDays: string;
	weekDays: any[];
}

export interface iCloudCalendarInvitee {
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

export interface iCloudCalendarEventDetailResponse {
	Alarm: Array<iCloudCalendarAlarm>;
	Event: Array<iCloudCalendarEvent>;
	Invitee: Array<iCloudCalendarInvitee>;
	Recurrence: Array<iCloudCalendarRecurrence>;
}

export interface iCloudCalendarStartupResponse {
	Alarm: Array<iCloudCalendarAlarm>,
	Event: Array<iCloudCalendarEvent>,
	Collection: Array<iCloudCalendarCollection>
}

export interface iCloudCalendarEventsResponse {
	Alarm: Array<iCloudCalendarAlarm>;
	Event: Array<iCloudCalendarEvent>;
	Recurrence: Array<iCloudCalendarRecurrence>;
}
