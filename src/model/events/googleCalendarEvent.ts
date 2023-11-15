import {CloudEvent} from "./cloudEvent";

export class GoogleCalendarEvent extends CloudEvent {
	kind: string;
	etag: string;
	id: string;
	status: string;
	htmlLink: string
	created: string;
	updated: string;
	summary: string
	creator: { email: string, self: boolean };
	organizer: { email: string, self: boolean };
	start: { date?: string, dateTime?: string, timeZone: string };
	end: { date?:string, dateTime?: string, timeZone: string };
	magicCalendarUID: string;
	sequence: number;
	reminders: { useDefault: boolean };
	eventType: string;
}
