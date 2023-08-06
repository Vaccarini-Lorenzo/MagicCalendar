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
	private _customPatterns: {name, patterns}[];
	private _pluginPath: string;
	private _nlp;
	private _ready: boolean;

	constructor() {
		this._ready = false;
		this._nlp = wink( model );
	}

	init(pluginPath: string){
		this._pluginPath = pluginPath;
		this.loadPatterns();
		this._nlp.learnCustomEntities(this._customPatterns);
		this._ready = true;
	}

	loadPatterns(){
		console.log("loading patterns...");
		const verbPatternPath = `${this._pluginPath}/.patterns/verb_patterns.txt`
		const nounPatternPath = `${this._pluginPath}/.patterns/noun_patterns.txt`
		const properNamePatternPath = `${this._pluginPath}/.patterns/proper_name_patterns.txt`

		const verbData = readFileSync(verbPatternPath);
		const parsedVerbs = JSON.parse(verbData.toString());
		const nounData = readFileSync(nounPatternPath);
		const parsedNouns = JSON.parse(nounData.toString());
		const properNameData = readFileSync(properNamePatternPath);
		const parsedProperNames = JSON.parse(properNameData.toString());

		this._customPatterns = [
			// All date objects, including "may" and "march", which for some reason are not included (may I do ..., march on the Alps)
			{name: "date", patterns: ["[|DATE] [|may] [|march] ", "on DATE"]},
			// 12th of Jan 2023, second of may
			{name: "ordinalDate", patterns: ["[ORDINAL] [|ADP] [DATE|may|march] [|DATE]"]},
			// July the third
			{name: "ordinalDateReverse", patterns: [" [|DATE] [DATE|may|march] [|DET] [ORDINAL]"]},
		];
		this._customPatterns.push(
			{name: "timeRange", patterns: ["[|ADP] [TIME|CARDINAL|NUM] [|am|pm] [|ADP] [TIME|CARDINAL|NUM] [|am|pm]", "[TIME|CARDINAL] [-|/] [TIME|CARDINAL]"]},
			{name: "exactTime", patterns: ["[at|for] [CARDINAL|TIME]"]}
		)
		this._customPatterns.push({name: "properName", patterns: parsedProperNames});
		this._customPatterns.push({name: "verb", patterns: parsedVerbs});
		this._customPatterns.push({name: "eventNoun", patterns: parsedNouns});
		this._customPatterns.push({name: "commonNouns", patterns: ["NOUN"]})
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
		const customEntities = auxiliaryStructures.customEntities;
		const customVerbEntities = auxiliaryStructures.customVerbEntities;
		const caseInsensitiveText = auxiliaryStructures.caseInsensitiveText;
		const lemmaMap = auxiliaryStructures.lemmaMap;

		// Filter customEntities (or customVerbEntities) to find the entity of the right type
		// The following structures are [{value, type}]
		const dates = this.filterDates(customEntities);
		const properNames = this.filterProperNames(customEntities);
		const eventNouns = this.filterEventNoun(customEntities);
		// TODO: commonNouns
		const commonNouns = this.filterCommonNoun(customEntities);
		const lemmaVerbs = this.filterLemmaVerbs(customVerbEntities);

		//console.log(`found ${dates.length} dates, ${lemmaVerbs.length} verbs, ${eventNouns.length} eventNouns, ${properNames.length} proper names`);
		if (dates.length == 0 || lemmaVerbs.length == 0 || eventNouns.length == 0) return null;

		const selectedDateIndex = caseInsensitiveText.indexOf(dates[0].value);

		// Find the nearest verb
		const selectedVerb = this.findVerb(caseInsensitiveText, lemmaVerbs, lemmaMap, selectedDateIndex)
		// Find the nearest event related noun
		const selectedEventNoun = this.findEventNoun(caseInsensitiveText, eventNouns, selectedVerb.index );
		// Find possible proper names (John)
		const selectedProperName = this.findProperName(sentence.value, properNames, selectedEventNoun.index);

		const cleanDates = this.cleanJunkDates(dates);
		// Fill selection array
		const selection = this.getSelectionArray(caseInsensitiveText, cleanDates, selectedEventNoun, selectedProperName);
		const startDateEndDate = this.parseDates(cleanDates);

		// Semantic check
		if(matchedEvent == null){
			sentence.injectEntityFields(startDateEndDate.start, startDateEndDate.end, selectedEventNoun.value)
			matchedEvent = eventController.checkEntities(sentence);
		}
		// Semantic check successful
		if (matchedEvent != null && matchedEvent.processed == true) return null;

		// Semantic check unsuccessful -> new event
		if (matchedEvent == null){
			const event = eventController.createNewEvent(sentence.filePath, sentence.value, selectedEventNoun.value, startDateEndDate.start, startDateEndDate.end);
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

	private getAuxiliaryStructures(sentence: Sentence): {caseInsensitiveText: string, customEntities: CustomEntities, customVerbEntities: CustomEntities, lemmaMap: Map<string, string>} {
		const caseInsensitiveText = sentence.value.toLowerCase();
		const its = this._nlp.its;
		const doc = this._nlp.readDoc(caseInsensitiveText);
		// "I'll have a meeting" -> "I", "'ll", "have" ...
		const tokens = doc.tokens().out(its.value);
		const customEntities = doc.customEntities();
		// "I'll have a meeting" -> "I", "will", "have" ...
		const lemmas = doc.tokens().out(its.lemma);
		// Associates lemma to token
		const lemmaMap = this.generateLemmaMap(tokens, lemmas);
		// "I'll have a meeting" -> ""I will have a meeting"
		const lemmaText = doc.tokens().out(its.lemma).toString();
		const lemmaDoc = this._nlp.readDoc(lemmaText);
		// Verbs in pattern are in lemma format
		const customVerbEntities = lemmaDoc.customEntities();
		return {caseInsensitiveText, customEntities, customVerbEntities, lemmaMap};
	}


	/*
	********************************************************************************************************************************
	*******************************************************					 *******************************************************
	******************************************************* PRIVATE METHODS  *******************************************************
	*******************************************************					 *******************************************************
	********************************************************************************************************************************
	 */

	private generateLemmaMap(tokens: string[], lemmas: string[]){
		const lemmaMap = new Map<string, string>();
		tokens.forEach((token, i) => lemmaMap.set(lemmas[i], token));
		return lemmaMap;
	}

	// TODO: Fix anys
	private filterDates(customEntities: CustomEntities): Detail[] {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => {
			const p = pos as unknown as Detail;
			return (p.type == "date") || (p.type == "ordinalDate") ||
				(p.type == "ordinalDateReverse") || (p.type == "timeRange") ||
				(p.type == "exactTime") || (p.type == "duration")
		}) as Detail[];
	}

	private filterProperNames(customEntities: CustomEntities): Detail[] {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => (pos as unknown as Detail).type == "properName") as Detail[];
	}

	private filterEventNoun(customEntities: CustomEntities): Detail[] {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => ((pos as unknown as Detail).type == "eventNoun")) as Detail[];
	}

	private filterCommonNoun(customEntities: CustomEntities): Detail[] {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => ((pos as unknown as Detail).type == "commonNoun")) as Detail[];
	}

	private filterLemmaVerbs(customVerbEntities: CustomEntities): Detail[] {
		const its = this._nlp.its;
		return customVerbEntities.out(its.detail).filter(pos => ((pos as unknown as Detail).type == "verb")) as Detail[];
	}

	private findVerb(text, lemmaVerbs, lemmaMap, selectedDateIndex): {value: string, index: number, type: string} {
		const selectedVerb = {
			value: "",
			index: -1,
			type: ""
		};
		let verbDistance = 1000;
		lemmaVerbs.forEach(lemmaVerb => {
			const verb = lemmaMap.get(lemmaVerb.value);
			const vIndex = text.indexOf(verb);
			const distanceFromDate = Math.abs(vIndex - selectedDateIndex);
			if (distanceFromDate < verbDistance){
				verbDistance = distanceFromDate;
				selectedVerb.value = verb;
				selectedVerb.index = vIndex;
				selectedVerb.type = verb.type;
			}
		})
		//console.log(`Found verb: ${selectedVerb.value}`);
		return selectedVerb;
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
			//console.log("proper name = " + properName.value)
			//console.log("caseSensitiveFirstChar = " + caseSensitiveFirstChar);
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






	testPOS(sentence: string) {
		sentence = sentence.toLowerCase();
		const its = this._nlp.its;
		//const as = this._nlp.as;
		const doc1 = this._nlp.readDoc(sentence);
		console.log(doc1.tokens().out(its.pos));
	}
}

const nplController = new NlpController();
export default nplController;
