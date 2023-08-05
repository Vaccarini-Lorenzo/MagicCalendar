import Event from "../model/event";
import iCloudMisc from "../iCloudJs/iCloudMisc";
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
	createNewEvent(title: string, description:string, duration: number, startDate: Date, endDate: Date): Event {
		const arrayStartDate = iCloudMisc.getArrayDate(startDate);
		const arrayEndDate = iCloudMisc.getArrayDate(endDate);
		const guid = this.generateNewUUID();

		const value = {
			title,
			duration,
			description,
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
		const firstUUID = iCloudMisc.getRandomHex(maxIntEightNibbles);
		const secondUUID = iCloudMisc.getRandomHex(maxIntFourNibbles);
		const thirdUUID = iCloudMisc.getRandomHex(maxIntFourNibbles);
		const fourthUUID = iCloudMisc.getRandomHex(maxIntFourNibbles);
		const lastUUID = iCloudMisc.getRandomHex(maxIntTwelveNibbles);
		return `${firstUUID}-${secondUUID}-${thirdUUID}-${fourthUUID}-${lastUUID}`
	}
}

const eventController = new EventController();
export default eventController;
