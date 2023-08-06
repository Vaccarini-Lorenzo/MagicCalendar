import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {Sentence} from "./sentence";

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
		// startDate is a [] does it work?
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
}
