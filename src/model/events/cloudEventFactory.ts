import {Sentence} from "../sentence";
import {CloudEvent} from "./cloudEvent";
import iCloudMisc from "../../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "./iCloudCalendarEvent";
import {Misc} from "../../misc/misc";
import {CalendarProvider} from "../cloudCalendar/calendarProvider";
import {GoogleCalendarEvent} from "./googleCalendarEvent";
import moment, {tz} from "moment-timezone";
import {SettingInterface} from "../../plugin/appSetting";

export class CloudEventFactory {
	settings: SettingInterface;

	constructor(settings: SettingInterface) {
		this.settings = settings;
	}

	createNewCloudEvent(sentence: Sentence): CloudEvent {
		if (this.settings.calendarProvider == CalendarProvider.APPLE) return this.createICloudCalendarEvent(sentence);
		else if (this.settings.calendarProvider == CalendarProvider.GOOGLE) return this.createGoogleCalendarEvent(sentence);
		else if (this.settings.calendarProvider == CalendarProvider.NOT_SELECTED) return this.createGenericCalendarEvent(sentence);
	}

	private createICloudCalendarEvent(sentence: Sentence): iCloudCalendarEvent {
		const arrayStartDate = iCloudMisc.getArrayDate(sentence.startDate);
		const arrayEndDate = iCloudMisc.getArrayDate(sentence.endDate);
		const guid = Misc.generateNewICloudUUID();

		const iCloudCalendarEvent = {
			cloudUUID: guid,
			cloudEventTitle: sentence.eventNoun,
			cloudEventStartDate: sentence.startDate,
			cloudEventEndDate: sentence.endDate,
			title: sentence.eventNoun,
			duration: sentence.duration,
			description : "",
			guid,
			location: "",
			startDate: arrayStartDate,
			endDate: arrayEndDate,
			localStartDate: arrayStartDate,
			localEndDate: arrayEndDate,
			extendedDetailsAreIncluded: true,
			allDay: false,
			isJunk: false,
			recurrenceMaster: false,
			recurrenceException: false,
			hasAttachments: false,
			icon: 0,
			changeRecurring: null
		} as iCloudCalendarEvent;

		return iCloudCalendarEvent;
	}

	private createGoogleCalendarEvent(sentence: Sentence): GoogleCalendarEvent {
		const cloudUUID = Misc.generateGoogleCloudUUID();
		const startDateTime = `${sentence.startDate.toISOString()}`
		const endDateTime = `${sentence.endDate.toISOString()}`

		const googleCalendarEvent = {
			cloudUUID,
			cloudEventTitle: sentence.eventNoun,
			cloudEventStartDate: sentence.startDate,
			cloudEventEndDate: sentence.endDate,
			summary: sentence.eventNoun,
			start: { dateTime: startDateTime, timeZone: this.settings.tz},
			end: { dateTime: endDateTime, timeZone: this.settings.tz },
			reminders: { useDefault: true }
		} as GoogleCalendarEvent;

		return googleCalendarEvent;
	}

	private createGenericCalendarEvent(sentence: Sentence): CloudEvent{
		const cloudUUID = Misc.generateGoogleCloudUUID();
		return {
			cloudUUID,
			cloudEventTitle: sentence.eventNoun,
			cloudEventStartDate: sentence.startDate,
			cloudEventEndDate: sentence.endDate,
		} as CloudEvent
	}

	injectSettings(settings: SettingInterface) {
		this.settings = settings;
	}
}
