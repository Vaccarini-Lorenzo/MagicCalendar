import {Sentence} from "../sentence";
import {CloudEvent} from "./cloudEvent";
import iCloudMisc from "../../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "./iCloudCalendarEvent";
import {Misc} from "../../misc/misc";
import {CalendarType} from "../cloudCalendar/calendarType";

export class CloudEventFactory {
	calendarType: CalendarType;

	constructor(calendarType: CalendarType) {
		this.calendarType = calendarType;
	}

	getNewCloudEvent(sentence: Sentence): CloudEvent {
		if (this.calendarType == CalendarType.ICALENDAR) return this.getICloudCalendarEvent(sentence);
	}

	private getICloudCalendarEvent(sentence: Sentence): iCloudCalendarEvent {
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
}
