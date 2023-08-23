import Event from "../model/event";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {Sentence} from "../model/sentence";
import iCloudController from "./iCloudController";
import {Notice} from "obsidian";
import {appendFileSync, readFileSync, writeFileSync} from "fs";
import {DateRange} from "../model/dateRange";

class EventController{
	// Map that connects the file path to the list of events
	private readonly _pathEventMap: Map<string, Event[]>;
	// Map that connects an event's UUID with the event object
	private readonly _uuidEventMap: Map<string, Event>;
	private _currentEvent : Event;
	private _pluginPath: string;

	constructor() {
		this._pathEventMap = new Map<string, Event[]>();
		this._uuidEventMap = new Map<string, Event>();
	}

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
	}

	init(){
		const pathEventMapFilePath = this._pluginPath + "/.pathEventMap.txt"
		const uuidEventMapFilePath = this._pluginPath + "/.uuidEventMap.txt"
		this.loadMapData(pathEventMapFilePath, this._pathEventMap, true);
		this.loadMapData(uuidEventMapFilePath, this._uuidEventMap, false);
	}

	private loadMapData(path: string, map: Map<string, any>, isValueList: boolean){
		try{
			// Filter out possible empty lines
			const dataList = readFileSync(path).toString().split("\n").filter(data => data.length > 0);
			dataList.forEach(data => {
				const json = JSON.parse(data);
				const key = Object.keys(json)[0]
				let value = Object.values(json)[0]
				const isKeyPresent = map.has(key);
				value = Event.fromJSON(value as Event);
				if (isKeyPresent) {
					const eventList = map.get(key);
					eventList.push(value as Event)
				} else {
					if (isValueList)
						map.set(key, [value] as Event[]);
					else
						map.set(key, value as Event);
				}
			})
		} catch (e) {
			if (e.code == 'ENOENT'){
				writeFileSync(path, "");
			} else {
				console.error("Error loading map data");
			}
		}
	}

	// First bland check on whole sentence (if nobody modified it, this should match)
	syntacticCheck(sentence: Sentence): Event | null {
		const events = this._pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		const filteredEvents = events.filter(event => event.sentence.value == sentence.value);
		if (filteredEvents.length == 0) return null;
		return filteredEvents[0];
	}

	// Second check: Check the semantic value of the sentence (event noun and dates)
	semanticCheck(sentence: Sentence): Event | null {
		const events = this._pathEventMap.get(sentence.filePath);
		if (events == undefined) return null;
		const filteredEvents = events.filter(event => {
			return sentence.eventNoun == event.sentence.eventNoun &&
				sentence.startDate.getTime() == event.sentence.startDate.getTime() &&
				sentence.endDate.getTime() == event.sentence.endDate.getTime()
		});
		if (filteredEvents.length == 0) return null;
		// Update the sentence associated to the event (it has been modified)
		filteredEvents[0].sentence.value = sentence.value;

		return filteredEvents[0];
	}

	createNewEvent(sentence: Sentence): Event {
		const arrayStartDate = iCloudMisc.getArrayDate(sentence.startDate);
		const arrayEndDate = iCloudMisc.getArrayDate(sentence.endDate);
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
		const fileEvents = this._pathEventMap.get(filePath);
		if (fileEvents == undefined){
			this._pathEventMap.set(filePath, [this._currentEvent])
		} else {
			fileEvents.push(this._currentEvent);
			this._pathEventMap.set(filePath, fileEvents)
		}
		this._uuidEventMap.set(this._currentEvent.value.guid, this._currentEvent);
		this._currentEvent.processed = true;
		// Syncing local storage - Needed to remember which events have been already processed
		this.syncLocalStorageEventLog(filePath, this._currentEvent);
		if (!sync) return;
		// Request to sync -> Push event to iCloud
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
		const pathEventMapFilePath = this._pluginPath + "/.pathEventMap.txt";
		const uuidEventMapFilePath = this._pluginPath + "/.uuidEventMap.txt";
		try {
			const pathEventMapData = `{"${eventFilePath}":${JSON.stringify(event)}}\n`;
			appendFileSync(pathEventMapFilePath, pathEventMapData);
			const uuidEventMapData = `{"${event.value.guid}":${JSON.stringify(event)}}\n`;
			appendFileSync(uuidEventMapFilePath, uuidEventMapData);
		} catch (e) {
			console.error("Error syncing local event log");
		}
	}


}

const eventController = new EventController();
export default eventController;
