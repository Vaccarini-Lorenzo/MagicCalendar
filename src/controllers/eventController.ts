import Event from "../model/event";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {Sentence} from "../model/sentence";
import iCloudController from "./iCloudController";

class EventController{
	pathEventMap: Map<string, Event[]>;
	uuidEventMap: Map<string, Event>;

	constructor() {
		this.pathEventMap = new Map<string, Event[]>();
		this.uuidEventMap = new Map<string, Event>();
	}

	// First bland check on whole sentence (if nobody modified it, this should match)
	matchSentenceValue(sentence: Sentence): Event | null {
		//console.log("[syntax check]: "+ sentence);
		const events = this.pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		const filteredEvents = events.filter(event => event.sentence.value == sentence.value);
		if (filteredEvents.length == 0) return null;
		//console.log("[syntax check]: Match found!");
		return filteredEvents[0];
	}

	// If the first check fails (event == undefined), check the entities (dates, eventNoun)
	checkEntities(sentence: Sentence): Event | null {
		//console.log("[semantic check]: "+ sentence);
		const events = this.pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		const filteredEvents = events.filter(event =>
			sentence.eventNoun == event.sentence.eventNoun &&
			sentence.startDate.getTime() == event.sentence.startDate.getTime() &&
			sentence.endDate.getTime() == event.sentence.endDate.getTime());
		if (filteredEvents.length == 0) return null;
		//console.log("[semantic check]: Match found!");
		// Update the sentence associated to the event (it has been modified)
		filteredEvents[0].sentence.value = sentence.value;
		//console.log("[semantic check]: Updating associated sentence value");
		return filteredEvents[0];
	}

	// TODO: CREATE A LOCAL SYNC for pathEventMap & uuidEventMap? - newEvent and processEvent
	// Minimal version
	createNewEvent(filePath: string, sentenceValue: string, eventNoun: string, startDate: Date, endDate: Date): Event {
		const normalizedMonthStartDate = startDate;
		normalizedMonthStartDate.setMonth(startDate.getMonth() + 1);
		const normalizedMonthEndDate = endDate;
		normalizedMonthEndDate.setMonth(endDate.getMonth() + 1);
		const duration = this.computeDuration(normalizedMonthStartDate, normalizedMonthEndDate)
		const arrayStartDate = iCloudMisc.getArrayDate(normalizedMonthStartDate);
		//console.log("arrayStartDate");
		//console.log(arrayStartDate);
		const arrayEndDate = iCloudMisc.getArrayDate(normalizedMonthEndDate);
		const guid = this.generateNewUUID();
		const allDay = normalizedMonthStartDate.getTime() == normalizedMonthEndDate.getTime()

		const value = {
			title: eventNoun,
			duration,
			description : "",
			guid,
			location: "",
			startDate: arrayStartDate,
			endDate: arrayEndDate,
			localStartDate: arrayStartDate,
			localEndDate: arrayEndDate,
			extendedDetailsAreIncluded: true,
			allDay: allDay,
			isJunk: false,
			recurrenceMaster: false,
			recurrenceException: false,
			hasAttachments: false,
			icon: 0,
			changeRecurring: null
		} as iCloudCalendarEvent;

		const newSentence =  new Sentence(filePath, sentenceValue);
		newSentence.injectEntityFields(startDate, endDate, eventNoun);
		const fileEvents = this.pathEventMap.get(filePath);
		const newEvent = new Event(value, newSentence);
		if (fileEvents == undefined){
			this.pathEventMap.set(filePath, [newEvent])
		} else {
			fileEvents.push(newEvent);
			this.pathEventMap.set(filePath, fileEvents)
		}
		this.uuidEventMap.set(newEvent.value.guid, newEvent);
		return newEvent;
	}

	processEvent(UUID: string){
		console.log("Processing event!");
		const event = this.uuidEventMap.get(UUID);
		if(event == undefined){
			console.log("Error retrieving the event from UUID");
			return;
		}
		event.processed = true;
		iCloudController.pushEvent(event);
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

	private computeDuration(startDate: Date, endDate: Date) {
		const diffMilli = endDate.getTime() - startDate.getTime();
		let diffMins = diffMilli / (1000 * 60);
		if (diffMins == 0){
			if (startDate.getHours() == 0 && startDate.getMinutes() == 0) return diffMins;
			diffMins = 60;
			endDate.setMinutes(startDate.getHours() + 1);
		}
		return diffMins;
	}
}

const eventController = new EventController();
export default eventController;
