import Event from "../model/event";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {Sentence} from "../model/sentence";

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
		//console.log("Creating an event!");

		//console.log("startDate");
		//console.log(startDate);
		//console.log("endDate");
		//console.log(endDate);
		const arrayStartDate = iCloudMisc.getArrayDate(startDate);
		//console.log("arrayStartDate");
		//console.log(arrayStartDate);
		const arrayEndDate = iCloudMisc.getArrayDate(endDate);
		const guid = this.generateNewUUID();
		const duration = this.computeDuration(startDate, endDate)


		const value = {
			title: eventNoun,
			duration,
			description : "",
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
		return diffMilli / (1000 * 60);
	}
}

const eventController = new EventController();
export default eventController;
