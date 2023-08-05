import wink, {Detail} from "wink-nlp";
import model from "wink-eng-lite-web-model";
import {readFileSync} from "fs";
import {ParsedResult} from "chrono-node";
import eventController, {Sentence} from "./eventController";
import smartDateParser from "./smartDateParser";

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
		// TODO: On the 18th is not recognized!!!
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
			{name: "date", patterns: ["[|DATE] [|may] [|march]"]},
			// 12th of Jan 2023, second of may
			{name: "ordinalDate", patterns: ["[ORDINAL] [|ADP] [DATE|may|march] [|DATE]"]},
			// July the third
			{name: "ordinalDateReverse", patterns: [" [|DATE] [DATE|may|march] [|DET] [ORDINAL]"]},
		];
		this._customPatterns.push(
			{name: "timeRange", patterns: ["[|ADP] [TIME|CARDINAL] [|ADP] [TIME|CARDINAL]"]},
			{name: "exactTime", patterns: ["[at] [CARDINAL|TIME]"]}
		)
		this._customPatterns.push({name: "properName", patterns: parsedProperNames});
		this._customPatterns.push({name: "duration", patterns: ["DURATION"]});
		this._customPatterns.push({name: "verb", patterns: parsedVerbs});
		this._customPatterns.push({name: "eventNoun", patterns: parsedNouns});
		this._customPatterns.push({name: "commonNouns", patterns: ["NOUN"]})
	}


	// TODO: Check if there is a better way
	process(sentence: Sentence): string[] {
		if(!this._ready){
			console.log("NPL not ready");
			return;
		}

		if (eventController.isSentenceProcessed(sentence)) return [];

		const text = sentence.value.toLowerCase();
		const its = this._nlp.its;
		const doc = this._nlp.readDoc(text);
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

		// Filter customEntities (or customVerbEntities) to find the entity of the right type
		const dates = this.filterDates(customEntities);
		const properNames = this.filterProperDate(customEntities);
		const eventNouns = this.filterEventNoun(customEntities);
		const commonNouns = this.filterCommonNoun(customEntities);
		const lemmaVerbs = this.filterLemmaVerbs(customVerbEntities);

		//console.log(`found ${dates.length} dates, ${lemmaVerbs.length} verbs, ${eventNouns.length} eventNouns, ${properNames.length} proper names`);
		if (dates.length == 0 || lemmaVerbs.length == 0 || eventNouns.length == 0) return [];
		console.log("Here");

		const selectedDateIndex = text.indexOf(dates[0].value);
		dates.forEach(d => console.log(`Found date: ${d.value}`))

		/*
		console.log("Lemma map");
		Array.from(lemmaMap.entries()).forEach(e => {
			console.log(e[0] + " -> " + e[1]);
		})

		 */

		const selectedVerb = this.findVerb(text, lemmaVerbs, lemmaMap, selectedDateIndex)
		const selectedEventNoun = this.findEventNoun(text, eventNouns, selectedVerb.index );
		const selectedProperName = this.findProperName(text, properNames, selectedEventNoun);

		//commonNouns.indexOf(selectedEventNoun);

		// Fill selection array
		const selection = this.getSelectionArray(text, dates, selectedEventNoun, selectedProperName);
		const startDateEndDate = this.parseDates(dates);
		
		//console.log(startEndDate.start, startEndDate.end);

		// Here we should parse the date and interact with an EventController (ec).
		// We will need the file path (key of the map of the ec)
		//

		return selection;
	}

	private generateLemmaMap(tokens: string[], lemmas: string[]){
		const lemmaMap = new Map<string, string>();
		tokens.forEach((token, i) => lemmaMap.set(lemmas[i], token));
		return lemmaMap;
	}

	private filterDates(customEntities: any): Detail[] {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => {
			return (pos.type == "date") || (pos.type == "ordinalDate") ||
				(pos.type == "ordinalDateReverse") || (pos.type == "timeRange") ||
				(pos.type == "exactTime") || (pos.type == "duration")
		});

	}

	private filterProperDate(customEntities: any): Detail[] {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => pos.type == "properName");
	}

	private filterEventNoun(customEntities: any): Detail[] {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => (pos.type == "eventNoun"));
	}

	private filterCommonNoun(customEntities: any) {
		const its = this._nlp.its;
		return customEntities.out(its.detail).filter(pos => (pos.type == "commonNoun"));
	}

	private filterLemmaVerbs(customVerbEntities: any) {
		const its = this._nlp.its;
		return customVerbEntities.out(its.detail).filter(pos => (pos.type == "verb"));
	}

	private findVerb(text, lemmaVerbs, lemmaMap, selectedDateIndex): {value: string, index: number} {
		const selectedVerb = {
			value: "",
			index: 0
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
			}
		})
		console.log(`Found verb: ${selectedVerb.value}`);
		return selectedVerb;
	}

	private findEventNoun(text, eventNouns, selectedVerbIndex) {
		const selectedEventNoun = {
			value: "",
			index: 0
		};
		let nounDistance = 1000;
		eventNouns.forEach(n => {
			const nIndex = text.indexOf(n.value);
			const distanceFromVerb = Math.abs(nIndex - selectedVerbIndex);
			if (distanceFromVerb < nounDistance){
				nounDistance = distanceFromVerb;
				selectedEventNoun.value = n.value;
				selectedEventNoun.index = nIndex;
			}
		})
		console.log(`Found eventNoun: ${selectedEventNoun.value}`);
		return selectedEventNoun;
	}

	private findProperName(text, properNames, selectedEventNoun): { value, index } | null {
		const selectedProperName = { value: "", index: -1 };
		let properNameDistance = 200;
		properNames.forEach(properName => {
			const pIndex = text.indexOf(properName.value);
			const distanceFromNoun = Math.abs(pIndex - selectedEventNoun);
			if (distanceFromNoun < properNameDistance){
				properNameDistance = distanceFromNoun;
				selectedProperName.value = properName.value;
				selectedProperName.index = pIndex;
			}
		})
		console.log(`Found properName: ${selectedProperName.value}`);
		return selectedProperName.index == -1 ? null : selectedProperName;
	}

	private getSelectionArray(text, dates, selectedEventNoun, selectedProperName) {
		const selection = []
		dates.forEach(date => {
			console.log(date);
			const dateIndex = text.indexOf(date.value);
			selection.push({value: date.value, index: dateIndex});
		})
		//selection.push(selectedVerb);    ---- Not needed since we don't need to highlight the verb too
		if (selectedEventNoun!= null) selection.push(selectedEventNoun);
		if (selectedProperName!= null) selection.push(selectedProperName);
		// Order by index (builder.add needs to be called with increasing values)
		const sorted = selection.sort((a, b) => a.index - b.index);
		const mapped = sorted.map(selected => selected.value);
		console.log(sorted, mapped);
		return mapped;
	}

	private parseDates(dates) {
		const timeRelatedString = dates.map(e => e.value).toString().replaceAll(",", " ");
		const parsed = smartDateParser.parse(timeRelatedString) as ParsedResult[];
		return smartDateParser.getDates(parsed);
	}






	test(sentence: string) {
		sentence = sentence.toLowerCase();
		const its = this._nlp.its;
		const doc = this._nlp.readDoc(sentence);
		const entities = doc.tokens().out(its.pos);
		console.log(entities);
		if (entities.length == 0) return;
		/*
		const timeRelatedString = entities.filter(e => e.type != "verb" && e.type != "noun").map(e => e.value).toString().replaceAll(",", " ");
		const parsed = parse(timeRelatedString) as ParsedResult[];
		const date = parsed[0].start.date();
		console.log(date);
		console.log(parsed);

		 */
	}
}

const nplController = new NlpController();
export default nplController;
