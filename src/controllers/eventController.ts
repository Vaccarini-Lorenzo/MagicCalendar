import Event from "../model/event";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {Sentence} from "../model/sentence";
import iCloudController from "./iCloudController";
import {Notice} from "obsidian";
import {appendFileSync, readFileSync, writeFileSync} from "fs";

class EventController{
	private _pathEventMap: Map<string, Event[]>;
	private _uuidEventMap: Map<string, Event>;
	private _currentEvent : Event;
	private _pluginPath: string;


	constructor() {
		this._pathEventMap = new Map<string, Event[]>();
		this._uuidEventMap = new Map<string, Event>();
	}

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
	}

	private loadMapData(path: string, map){
		try{
			const dataList = readFileSync(path).toString().split("\n");
			dataList.forEach(data => {
				//console.log(data);
				//const json = JSON.parse(data);
				//console.log(json);
			})
		} catch (e) {
			if (e.code == 'ENOENT'){
				console.log("eventLogs file not found: creating it");
				writeFileSync(path, "");
			} else {
				console.log(e);
			}
		}
	}

	init(){
		const pathEventMapFilePath = this._pluginPath + "/.pathEventMap.txt"
		const uuidEventMapFilePath = this._pluginPath + "/.uuidEventMap.txt"
		this.loadMapData(pathEventMapFilePath, this._pathEventMap);
		this.loadMapData(uuidEventMapFilePath, this._uuidEventMap);
	}

	// First bland check on whole sentence (if nobody modified it, this should match)
	syntacticCheck(sentence: Sentence): Event | null {
		//console.log("[syntax check]: "+ sentence);
		const events = this._pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		const filteredEvents = events.filter(event => event.sentence.value == sentence.value);
		if (filteredEvents.length == 0) return null;
		//console.log("[syntax check]: Match found!");
		return filteredEvents[0];
	}

	semanticCheck(sentence: Sentence): Event | null {
		console.log("Semantic check: ", sentence);
		const events = this._pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		const filteredEvents = events.filter(event => {
			console.log("EVENT: ", event);
			console.log("eventNoun == eventNoun  ", sentence.eventNoun == event.sentence.eventNoun);
			console.log("startDate.getTime() == startDate.getTime()  ", sentence.startDate.getTime() == event.sentence.startDate.getTime())
			console.log("endDate.getTime() == endDate.getTime()  ", sentence.endDate.getTime() == event.sentence.endDate.getTime())

			return sentence.eventNoun == event.sentence.eventNoun &&
				sentence.startDate.getTime() == event.sentence.startDate.getTime() &&
				sentence.endDate.getTime() == event.sentence.endDate.getTime()
		});
		if (filteredEvents.length == 0) return null;
		// Update the sentence associated to the event (it has been modified)
		filteredEvents[0].sentence.value = sentence.value;
		return filteredEvents[0];
	}

	// TODO: CREATE A LOCAL SYNC for pathEventMap & uuidEventMap? - newEvent and processEvent
	// TODO: FIX - Aux structure with one single tmp event. The event map is updated ONLY when an event is processed or ignored
	// Minimal version
	createNewEvent(sentence: Sentence): Event {
		console.log("creating a new event");
		const arrayStartDate = iCloudMisc.getArrayDate(sentence.startDate);
		const arrayEndDate = iCloudMisc.getArrayDate(sentence.endDate);
		console.log("arrayEndDate");
		console.log(arrayEndDate);
		const guid = this.generateNewUUID();

		const value = {
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

		const newEvent = new Event(value, sentence);
		this._currentEvent = newEvent;
		return newEvent;
	}

	processEvent(filePath: string, sync: boolean){
		console.log("Processing event!");
		const fileEvents = this._pathEventMap.get(filePath);
		if (fileEvents == undefined){
			this._pathEventMap.set(filePath, [this._currentEvent])
		} else {
			fileEvents.push(this._currentEvent);
			this._pathEventMap.set(filePath, fileEvents)
		}
		this._uuidEventMap.set(this._currentEvent.value.guid, this._currentEvent);
		this._currentEvent.processed = true;
		//this.syncLocalStorageEventLog(filePath, this._currentEvent);
		if (!sync) return;
		iCloudController.pushEvent(this._currentEvent).then((status => {
			if (status) new Notice("📅 The event has been synchronized!")
			else new Notice("🤷 There has been an error synchronizing the event...")
		}));
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

	private syncLocalStorageEventLog(eventFilePath: string, event: Event) {
		const pathEventMapFilePath = this._pluginPath + "/.pathEventMap.txt"
		const uuidEventMapFilePath = this._pluginPath + "/.uuidEventMap.txt"
		try {
			const pathEventMapData = `{"${eventFilePath}":${JSON.stringify(event)}}\n`;
			appendFileSync(pathEventMapFilePath, pathEventMapData);
			const uuidEventMapData = `{"${event.value.guid}":${JSON.stringify(event)}}\n`;
			appendFileSync(uuidEventMapFilePath, uuidEventMapData);
		} catch (e) {
			console.log("Error syncing local storage: " + e);
		}
	}
}

const eventController = new EventController();
export default eventController;
