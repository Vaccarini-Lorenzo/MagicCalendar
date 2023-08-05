import Event from "../model/event";
import Misc from "../iCloudJs/misc";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";

export class Sentence {
	filePath: string;
	value: string;

	constructor(filePath: string, value: string) {
		this.filePath = filePath;
		this.value = value;
	}
}

class EventController{
	sentenceEventMap: Map<Sentence, Event>;

	constructor() {
		this.sentenceEventMap = new Map<Sentence, Event>();
	}

	isSentenceProcessed(sentence: Sentence) {
		const event = this.sentenceEventMap.get(sentence);
		if (event == undefined) return false;
		return event.processed;
	}

	// Minimal version
	createNewEvent(tz: string, title: string, description:string, duration: number, pGuid: string, startDate: Date, endDate: Date): Event {
		const arrayStartDate = Misc.getArrayDate(startDate);
		const arrayEndDate = Misc.getArrayDate(endDate);
		const guid = this.generateNewUUID();

		const value = {
			tz,
			title,
			duration,
			description,
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

		return new Event(value);
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

const eventController = new EventController();
export default eventController;
