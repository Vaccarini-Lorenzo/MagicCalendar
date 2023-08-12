import wink, {CustomEntities, Detail} from "wink-nlp";
import model from "wink-eng-lite-web-model";
import {readFileSync} from "fs";
import {ParsedResult} from "chrono-node";
import eventController from "./eventController";
import smartDateParser from "./smartDateParser";
import {Misc} from "../misc/misc";
import {Sentence} from "../model/sentence";
import Event from "../model/event";

class NlpController {
	// Main patterns look for dates, intentional verbs and proper names
	private _customMainPatterns: {name, patterns}[];
	// Secondary patterns exploit the main one. If an intentional verb is not found they look for an event-related noun
	private _customSecondaryPatterns: {name, patterns}[];
	private _pluginPath: string;
	private _mainNLP;
	private _secondaryNLP;
	private _ready: boolean;

	constructor() {
		this._ready = false;
		this._mainNLP = wink( model );
		this._secondaryNLP = wink( model );
	}

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
	}

	init(){
		this.loadPatterns();
		this._mainNLP.learnCustomEntities(this._customMainPatterns);
		this._secondaryNLP.learnCustomEntities(this._customSecondaryPatterns);
		this._ready = true;
	}

	loadPatterns(){
		console.log("loading patterns...");
		const nounPatternPath = `${this._pluginPath}/.patterns/noun_patterns.txt`
		const properNamePatternPath = `${this._pluginPath}/.patterns/proper_name_patterns.txt`

		const nounData = readFileSync(nounPatternPath);
		const parsedNouns = JSON.parse(nounData.toString());
		const properNameData = readFileSync(properNamePatternPath);
		const parsedProperNames = JSON.parse(properNameData.toString());

		this._customMainPatterns = [
			// All date objects, including "may" and "march", which for some reason are not included (may I do ..., march on the Alps)
			{name: "date", patterns: ["[|DATE] [|may] [|march] ", "on DATE"]},
			// 12th of Jan 2023, second of may
			{name: "ordinalDate", patterns: ["[ORDINAL] [|ADP] [DATE|may|march] [|DATE]"]},
			// July the third
			{name: "ordinalDateReverse", patterns: [" [|DATE] [DATE|may|march] [|DET] [ORDINAL]"]},
		];
		this._customMainPatterns.push(
			{name: "timeRange", patterns: ["[|ADP] [TIME|CARDINAL|NUM] [|am|pm] [|ADP] [TIME|CARDINAL|NUM] [|am|pm]", "[TIME|CARDINAL] [-|/] [TIME|CARDINAL]"]},
			{name: "exactTime", patterns: ["[at|for] [CARDINAL|TIME]"]}
		)
		this._customMainPatterns.push({name: "properName", patterns: parsedProperNames});
		this._customMainPatterns.push({name: "eventNoun", patterns: parsedNouns});
		//this._customPatterns.push({name: "commonNouns", patterns: ["NOUN"]})
		this._customSecondaryPatterns = [{name: "intentionalVerb", patterns: ["[|AUX] [VERB] [|ADP] [|DET] [NOUN]"]}];
	}


	process(sentence: Sentence): {selection: {value, index, type}[], event: Event} | null{

		// The main idea: Let's find the main date. Once that is done, find the nearest verb.
		// Then the nearest noun (related to the event category) to the verb.
		// We then check if the selected event-noun has some common/generic noun on the side
		// e.g.:
		// The common noun -> Football   match <- event related noun

		// The verb pattern is based on lemmas, so we need to work on customVerbEntities (from lemmaDoc)

		if(!this._ready){
			console.log("NPL not ready");
			return null;
		}

		// How can I uniquely identify a string as an event?
		// If the string was immutable, it could be easy, but since its structure can be modified
		// it's necessary do define three scenarios.
		// 1. The string has not been modified in any way, not syntactically nor semantically:
		//	  This mean that I can match an event with the string value - easy
		// 2. The string has been modified but just syntactically:
		//    I shouldn't create a new event just because the syntax changed, but to associate
		//	  an event to the modified string it's necessary to compute the event-related objects
		//	  from the new string (eventNoun, dates etc...)
		// 3. The string has been modified semantically (and/or syntactically):
		//	  This mean that we can not assume that the modified string is associated to an event
		//	  and therefore we need to create one.

		// First match - Syntax check
		let matchedEvent = eventController.matchSentenceValue(sentence);
		if (matchedEvent != null && matchedEvent.processed == true) return null;

		// If the syntax check fails we'll need to compute the semantic check, once
		// all the sentence elements are defined

		const auxiliaryStructures = this.getAuxiliaryStructures(sentence);
		const customMainEntities = auxiliaryStructures.customMainEntities;
		const customSecondaryEntities = auxiliaryStructures.customSecondaryEntities;
		const caseInsensitiveText = auxiliaryStructures.caseInsensitiveText;

		const dates = this.filterDates(customMainEntities);
		if (dates.length == 0) return null;

		const selectedDateIndex = caseInsensitiveText.indexOf(dates[0].value);

		let selectedEventNoun;
		const eventNouns = this.filterEventNoun(customMainEntities);
		selectedEventNoun = this.findEventNoun(caseInsensitiveText, eventNouns, selectedDateIndex);

		if (selectedEventNoun.index == -1){
			console.log("A custom event noun has not been found");
			const selectedIntentionalVerb: {value, index, type, noun} = this.findIntentionalVerb(auxiliaryStructures.customSecondaryEntities, caseInsensitiveText, selectedDateIndex);
			selectedEventNoun = {
				value: selectedIntentionalVerb.noun,
				index: auxiliaryStructures.caseInsensitiveText.indexOf(selectedIntentionalVerb.noun),
				type: "eventNoun"
			};
		}

		if (selectedEventNoun.index == -1) return null;
		console.log("Found intentional verb")

		console.log("Event noun: ", selectedEventNoun);

		// An event noun (either related to an intentional verb or from the custom list) has not been found

		// Find possible proper names (John)
		const properNames = this.filterProperNames(customMainEntities);
		const selectedProperName = this.findProperName(sentence.value, properNames, selectedEventNoun.index);

		// TODO: commonNouns
		//const commonNouns = this.filterCommonNoun(customEntities);

		const cleanDates = this.cleanJunkDates(dates);
		// Fill selection array
		const selection = this.getSelectionArray(caseInsensitiveText, cleanDates, selectedEventNoun, selectedProperName);
		const startDateEndDate = this.parseDates(cleanDates);

		if (startDateEndDate == undefined) return;

		// Semantic check
		if(matchedEvent == null){
			sentence.injectEntityFields(startDateEndDate.start, startDateEndDate.end, selectedEventNoun.value)
			let eventTitle = selectedEventNoun.value;
			if (selectedProperName != null) eventTitle += ` ${selectedProperName.value}`
			sentence.eventNoun = eventTitle;
			matchedEvent = eventController.checkEntities(sentence);
		}
		// Semantic check successful
		if (matchedEvent != null && matchedEvent.processed == true) return null;

		// Semantic check unsuccessful -> new event
		if (matchedEvent == null){
			//let eventTitle = selectedEventNoun.value;
			//if (selectedProperName != null) eventTitle += ` ${selectedProperName.value}`
			const event = eventController.createNewEvent(sentence.filePath, sentence.value, sentence.eventNoun, startDateEndDate.start, startDateEndDate.end);
			return {
				selection,
				event
			};
		}

		return {
			selection,
			event: matchedEvent
		}

	}


	/*
	********************************************************************************************************************************
	*******************************************************					 *******************************************************
	******************************************************* PRIVATE METHODS  *******************************************************
	*******************************************************					 *******************************************************
	********************************************************************************************************************************
 	*/

	private getAuxiliaryStructures(sentence: Sentence): {caseInsensitiveText: string, customMainEntities: CustomEntities, customSecondaryEntities: CustomEntities} {
		const caseInsensitiveText = sentence.value.toLowerCase();
		let doc = this._mainNLP.readDoc(caseInsensitiveText);
		const customMainEntities = doc.customEntities();
		doc = this._secondaryNLP.readDoc(caseInsensitiveText);
		const customSecondaryEntities = doc.customEntities();
		return {caseInsensitiveText, customMainEntities, customSecondaryEntities};
	}

	private generateLemmaMap(tokens: string[], lemmas: string[]){
		const lemmaMap = new Map<string, string>();
		tokens.forEach((token, i) => lemmaMap.set(lemmas[i], token));
		return lemmaMap;
	}

	// TODO: Fix anys
	private filterDates(customEntities: CustomEntities): Detail[] {
		const its = this._mainNLP.its;
		return customEntities.out(its.detail).filter(pos => {
			const p = pos as unknown as Detail;
			return (p.type == "date") || (p.type == "ordinalDate") ||
				(p.type == "ordinalDateReverse") || (p.type == "timeRange") ||
				(p.type == "exactTime") || (p.type == "duration")
		}) as Detail[];
	}

	private filterProperNames(customEntities: CustomEntities): Detail[] {
		const its = this._mainNLP.its;
		return customEntities.out(its.detail).filter(pos => (pos as unknown as Detail).type == "properName") as Detail[];
	}

	private filterEventNoun(customEntities: CustomEntities): Detail[] {
		const its = this._secondaryNLP.its;
		return customEntities.out(its.detail).filter(pos => ((pos as unknown as Detail).type == "eventNoun")) as Detail[];
	}

	private filterCommonNoun(customEntities: CustomEntities): Detail[] {
		const its = this._mainNLP.its;
		return customEntities.out(its.detail).filter(pos => ((pos as unknown as Detail).type == "commonNoun")) as Detail[];
	}

	private findIntentionalVerb(customEntities: CustomEntities, text: string, selectedDateIndex: number): {value, index, type, noun} {
		const selectedIntentionalVerb = {
			value: "",
			index: -1,
			type: "",
			noun: ""
		};
		const intentionalVerbs = customEntities.out(this._mainNLP.its.detail).filter(pos => ((pos as unknown as Detail).type == "intentionalVerb")) as Detail[];
		if (intentionalVerbs.length == 0) return selectedIntentionalVerb;
		let verbDistance = 1000;
		intentionalVerbs.forEach(intentionalVerb => {
			const vIndex = text.indexOf(intentionalVerb.value);
			const distanceFromDate = Math.abs(vIndex - selectedDateIndex);
			if (distanceFromDate < verbDistance){
				verbDistance = distanceFromDate;
				selectedIntentionalVerb.value = intentionalVerb.value;
				selectedIntentionalVerb.index = vIndex;
				selectedIntentionalVerb.type = intentionalVerb.type;
			}
		})
		selectedIntentionalVerb.noun = selectedIntentionalVerb.value.split(" ").last();
		return selectedIntentionalVerb;
	}

	private findEventNoun(text, eventNouns, selectedVerbIndex): {value: string, index: number, type: string} {
		const selectedEventNoun = {
			value: "",
			index: -1,
			type: ""
		};
		let nounDistance = 1000;
		eventNouns.forEach(n => {
			const nIndex = text.indexOf(n.value);
			const distanceFromVerb = Math.abs(nIndex - selectedVerbIndex);
			if (distanceFromVerb < nounDistance){
				nounDistance = distanceFromVerb;
				selectedEventNoun.value = n.value;
				selectedEventNoun.index = nIndex;
				selectedEventNoun.type = n.type;
			}
		})
		//console.log(`Found eventNoun: ${selectedEventNoun.value}`);
		return selectedEventNoun;
	}

	private findProperName(text, properNames, selectedEventNoun) : {value: string, index: number, type: string} | null {
		const selectedProperName = {
			value: "",
			index: -1,
			type: ""
		};
		let properNameDistance = 1000;
		properNames.forEach(properName => {
			const pIndex = text.toLowerCase().indexOf(properName.value);
			let caseSensitiveFirstChar = text[pIndex];
			//console.log("properName = " + properName.value);
			// Checking ad-positions
			const adp = properName.value.split(" ").length == 1 ? undefined : properName.value.split(" ")[0];
			//console.log("adp = " + adp);
			if (adp != undefined) caseSensitiveFirstChar = text[pIndex + adp.length + 1];
			// Excluding lower case proper names to confuse words like "amber" and "Amber"
			if (Misc.isLowerCase(caseSensitiveFirstChar)) return;
			const distanceFromEventNoun = Math.abs(pIndex - selectedEventNoun);
			if (distanceFromEventNoun < properNameDistance){
				properNameDistance = distanceFromEventNoun;
				selectedProperName.value = properName.value;
				selectedProperName.index = pIndex;
				selectedProperName.type = properName.type;
			}
		})
		//console.log(`Found properName: ${selectedProperName.value}`);
		return selectedProperName.index == -1 ? null : selectedProperName;
	}

	private getSelectionArray(text: string, dates: {value, index, type}[], selectedEventNoun: {value, index, type}, selectedProperName: {value, index, type}): {value, index, type}[] {
		const selection = []
		dates.forEach(date => {
			const dateIndex = text.indexOf(date.value);
			selection.push({value: date.value, index: dateIndex, type: date.type});
		})
		//selection.push(selectedVerb);    ---- Not needed since we don't need to highlight the verb too
		if (selectedEventNoun!= null) selection.push(selectedEventNoun);
		if (selectedProperName!= null) selection.push(selectedProperName);
		// Order by index (builder.add needs to be called with increasing values)
		const sorted = selection.sort((a, b) => a.index - b.index);
		return sorted;
	}

	// There can be just one date (2023/01/01, The second of August ...) and/or one time (at 2, from 10 to 12);
	// I'm assuming that the first date (syntactically) is the correct one
	private cleanJunkDates(dates){
		const dateComponentPatterns = ["date", "ordinalDate", "ordinalDateReverse"];
		const timePatterns = ["exactTime", "timeRange"];
		// array.indexOf(element) > -1 is the same as array.contains(element)
		const dateComponents = dates.filter(d => dateComponentPatterns.indexOf(d.type) > -1);
		const times = dates.filter(t => timePatterns.indexOf(t.type) > -1);
		let cleanDates = dates;
		//console.log("Before cleaning");
		//console.log(cleanDates);
		if(dateComponents.length > 1){
			//console.log("Found multiple dates");
			// Filtering: Either it's a date or it's the very first value
			cleanDates = cleanDates.filter(d => ((timePatterns.indexOf(d.type) > -1) || (d.value == dateComponents[0].value)));
			//console.log("After dates cleaning");
			//console.log(cleanDates);
		}
		if(times.length > 1){
			//console.log("Found multiple times");
			// Filtering: Either it's a time or it's the very first value
			cleanDates = cleanDates.filter(d =>  ((dateComponentPatterns.indexOf(d.type) > -1) || (d.value == times[0].value)));
			//console.log("After times cleaning");
			//console.log(cleanDates);
		}
		return cleanDates;
	}

	private parseDates(dates) {
		const timeRelatedString = dates.map(e => e.value).toString().replaceAll(",", " ");
		const parsed = smartDateParser.parse(timeRelatedString) as ParsedResult[];
		return smartDateParser.getDates(parsed);
	}

	/*
	private singularize(text: string){
		const pluralEndings = {
			ves: 'fe ',
			ies: 'y ',
			i: 'us ',
			zes: 'ze ',
			ses: 's ',
			es: 'e ',
			"\\ws": ' '
		};
		return text.replace(
			new RegExp(`(${Object.keys(pluralEndings).join('|')}) `),
			plural => {
				const key = plural.replace(" ", "");
				console.log("key " + key);
				return(pluralEndings[key]);
			}
		);
	}
*/





	testPOS(sentence: Sentence) {
		const auxiliaryStructures = this.getAuxiliaryStructures(sentence);
		const customEntities = auxiliaryStructures.customMainEntities;
		const customSecondaryEntities = auxiliaryStructures.customSecondaryEntities;
		const doc1 = this._mainNLP.readDoc(sentence.value);
		console.log(doc1.tokens().out(this._mainNLP.its.pos));
		console.log(customEntities.out(this._mainNLP.its.detail));
		console.log("SECONDARY")
		console.log(customSecondaryEntities.out(this._secondaryNLP.its.detail));

	}
}

const nplController = new NlpController();
export default nplController;
