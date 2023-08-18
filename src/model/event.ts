import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {Sentence} from "./sentence";
import eventController from "../controllers/eventController";

export default class Event {
	value: iCloudCalendarEvent;
	sentence: Sentence;
	hash: number;
	processed: boolean;

	constructor(value: iCloudCalendarEvent, sentence: Sentence) {
		this.value = value;
		this.sentence = sentence;
		this.hash = this.computeHash();
		this.processed = false;
	}

	injectICloudComponents({tz, pGuid}){
		this.value.tz = tz;
		this.value.pGuid = pGuid;
	}

	private computeHash(): number{
		const tagProperties = this.sentence.toString();
		let hash = 0,
			i, chr;
		if (tagProperties.length === 0) return hash;
		for (i = 0; i < tagProperties.length; i++) {
			chr = tagProperties.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}

	static fromJSON(json: Event) {
		const filePath = json.sentence.filePath;
		const value = json.sentence.value;
		const sentence = new Sentence(filePath, value);
		const startDate = new Date(json.sentence.startDate);
		const endDate = new Date(json.sentence.endDate);
		const eventNoun = json.sentence.eventNoun;
		sentence.injectSemanticFields(startDate, endDate, eventNoun);
		const event = eventController.createNewEvent(sentence);
		event.processed = true;
		return event;
	}
}
