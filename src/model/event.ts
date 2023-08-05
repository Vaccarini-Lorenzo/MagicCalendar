import {iCloudCalendarEvent} from "../iCloudJs/calendar";

export default class Event {
	value: iCloudCalendarEvent;
	hash: number;
	processed: boolean;

	constructor(value: iCloudCalendarEvent) {
		this.value = value;
		this.hash = this.computeHash();
		this.processed = false;
	}

	private computeHash(): number{
		// startDate is a [] does it work?
		const tagProperties = this.value.title + this.value.startDate + this.value.endDate;
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
