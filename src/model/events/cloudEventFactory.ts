import {Sentence} from "../sentence";
import {CloudEvent} from "./cloudEvent";
import iCloudMisc from "../../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "./iCloudCalendarEvent";
import {Misc} from "../../misc/misc";
import {CalendarProvider} from "../cloudCalendar/calendarProvider";
import {GoogleCalendarEvent} from "./googleCalendarEvent";
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

	updateCloudEvent(cloudEvent: CloudEvent, updateMap: Map<string, string>){
		this.updateCloudEventComponents(cloudEvent, updateMap);
		if (this.settings.calendarProvider == CalendarProvider.APPLE) return this.updateICloudCalendarEvent(cloudEvent);
		else if (this.settings.calendarProvider == CalendarProvider.GOOGLE) return this.updateGoogleCalendarEvent(cloudEvent);
	}

	private createICloudCalendarEvent(sentence: Sentence): iCloudCalendarEvent {
		const arrayStartDate = iCloudMisc.getArrayDate(sentence.startDate);
		const arrayEndDate = iCloudMisc.getArrayDate(sentence.endDate);
		const guid = Misc.generateICloudUUID();

		return {
			cloudEventUUID: guid,
			cloudEventTitle: sentence.eventNoun,
			cloudEventStartDate: sentence.startDate,
			cloudEventEndDate: sentence.endDate,
			title: sentence.eventNoun,
			duration: sentence.duration,
			description: "",
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
	}

	private createGoogleCalendarEvent(sentence: Sentence): GoogleCalendarEvent {
		const cloudUUID = Misc.generateGoogleCloudUUID();
		const startDateTime = `${sentence.startDate.toISOString()}`
		const endDateTime = `${sentence.endDate.toISOString()}`

		return {
			cloudEventUUID: cloudUUID,
			cloudEventTitle: sentence.eventNoun,
			cloudEventStartDate: sentence.startDate,
			cloudEventEndDate: sentence.endDate,
			summary: sentence.eventNoun,
			start: {dateTime: startDateTime, timeZone: this.settings.tz},
			end: {dateTime: endDateTime, timeZone: this.settings.tz},
			reminders: {useDefault: true}
		} as GoogleCalendarEvent;
	}

	private createGenericCalendarEvent(sentence: Sentence): CloudEvent{
		const cloudUUID = Misc.generateGoogleCloudUUID();
		return {
			cloudEventUUID: cloudUUID,
			cloudEventTitle: sentence.eventNoun,
			cloudEventStartDate: sentence.startDate,
			cloudEventEndDate: sentence.endDate,
		} as CloudEvent
	}


	private updateCloudEventComponents(cloudEvent: CloudEvent, updateMap: Map<string, string>) {
		Array.from(updateMap.entries()).forEach(updateEntry => {
			const propertyName = updateEntry[0];
			const newValue = updateEntry[1];
			switch (propertyName){
				case "cloudEventStartDate":
					cloudEvent.cloudEventStartDate = new Date(newValue);
					break;
				case "cloudEventEndDate":
					cloudEvent.cloudEventEndDate = new Date(newValue);
					break;
				case "cloudEventTitle":
					cloudEvent.cloudEventTitle = newValue;
					break;
			}
		})
	}

	private updateICloudCalendarEvent(cloudEvent: CloudEvent) {
		const iCloudCalendarEvent = cloudEvent as iCloudCalendarEvent;
		const arrayStartDate = iCloudMisc.getArrayDate(cloudEvent.cloudEventStartDate);
		const arrayEndDate = iCloudMisc.getArrayDate(cloudEvent.cloudEventEndDate);
		iCloudCalendarEvent.startDate = arrayStartDate;
		iCloudCalendarEvent.endDate = arrayEndDate;
		iCloudCalendarEvent.localStartDate = arrayStartDate;
		iCloudCalendarEvent.localEndDate = arrayEndDate;
		iCloudCalendarEvent.title = cloudEvent.cloudEventTitle;
	}

	private updateGoogleCalendarEvent(cloudEvent: CloudEvent) {
		const googleCalendarEvent = cloudEvent as GoogleCalendarEvent;
		const startDateTime = `${cloudEvent.cloudEventStartDate.toISOString()}`
		const endDateTime = `${cloudEvent.cloudEventEndDate.toISOString()}`
		googleCalendarEvent.start = {dateTime: startDateTime, timeZone: this.settings.tz};
		googleCalendarEvent.end = {dateTime: endDateTime, timeZone: this.settings.tz};
		googleCalendarEvent.summary = cloudEvent.cloudEventTitle;
	}

	injectSettings(settings: SettingInterface) {
		this.settings = settings;
	}
}
