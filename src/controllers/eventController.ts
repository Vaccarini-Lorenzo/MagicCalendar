import Event from "../model/event";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {Sentence} from "../model/sentence";
import iCloudController from "./iCloudController";

class EventController{
	pathEventMap: Map<string, Event[]>;
	uuidEventMap: Map<string, Event>;
	currentEvent : Event;

	constructor() {
		this.pathEventMap = new Map<string, Event[]>();
		this.uuidEventMap = new Map<string, Event>();
	}

	// First bland check on whole sentence (if nobody modified it, this should match)
	matchSentenceValue(sentence: Sentence): Event | null {
		console.log("[syntax check]: "+ sentence);
		const events = this.pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		const filteredEvents = events.filter(event => event.sentence.value == sentence.value);
		if (filteredEvents.length == 0) return null;
		console.log("[syntax check]: Match found!");
		return filteredEvents[0];
	}


	// TODO: Fix different event noun between sentence found and event saved
	// If the first check fails (event == undefined), check the entities (dates, eventNoun)
	checkEntities(sentence: Sentence): Event | null {
		console.log("[semantic check]: "+ sentence);
		const events = this.pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		// NodeJS months start from 0 (0: jan, 11: dec) and iCal months start from 1 (1:jan, 12: dec)
		// When saving the event the month variable is increased by one for simplicity
		// In the entity check it's needed to take into account this difference
		const filteredEvents = events.filter(event => {
			console.log(event);
			console.log("sentence", sentence);
			const iCalParsedStartDate = sentence.startDate;
			iCalParsedStartDate.setMonth(sentence.startDate.getMonth() + 1);
			const iCalParsedEndDate = sentence.endDate;
			iCalParsedEndDate.setMonth(sentence.endDate.getMonth() + 1);
			return sentence.eventNoun == event.sentence.eventNoun &&
				iCalParsedStartDate.getTime() == event.sentence.startDate.getTime() &&
				iCalParsedEndDate.getTime() == event.sentence.endDate.getTime()
		});
		if (filteredEvents.length == 0) return null;
		console.log("[semantic check]: Match found!");
		// Update the sentence associated to the event (it has been modified)
		filteredEvents[0].sentence.value = sentence.value;
		console.log("[semantic check]: Updating associated sentence value");
		return filteredEvents[0];
	}

	// TODO: CREATE A LOCAL SYNC for pathEventMap & uuidEventMap? - newEvent and processEvent
	// TODO: FIX - Aux structure with one single tmp event. The event map is updated ONLY when an event is processed or ignored
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
		const newEvent = new Event(value, newSentence);
		this.currentEvent = newEvent;
		return newEvent;
	}

	processEvent(filePath: string){
		console.log("Processing event!");
		const fileEvents = this.pathEventMap.get(filePath);
		if (fileEvents == undefined){
			this.pathEventMap.set(filePath, [this.currentEvent])
		} else {
			fileEvents.push(this.currentEvent);
			this.pathEventMap.set(filePath, fileEvents)
		}
		this.uuidEventMap.set(this.currentEvent.value.guid, this.currentEvent);

		this.currentEvent.processed = true;
		iCloudController.pushEvent(this.currentEvent);
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
