import wink, {CustomEntities, Detail, PartOfSpeech, Tokens} from "wink-nlp";
import model from "wink-eng-lite-web-model";
import {readFileSync} from "fs";
import {ParsedResult} from "chrono-node";
import eventController from "./eventController";
import smartDateParser from "./smartDateParser";
import {Misc} from "../misc/misc";
import {Sentence} from "../model/sentence";
import Event from "../model/event";
import {DateRange} from "../model/dateRange";
import {SettingInterface} from "../plugin/appSetting";
import {Media} from "../misc/media";

class NlpController {
	private readonly _customPatterns: {name, patterns}[];
	private readonly _secondaryCustomPatterns: {name, patterns}[];
	private _setting: SettingInterface;
	private _pluginPath: string;
	private _mainNLP;
	// Secondary NLP to avoid overlap between custom entities
	// e.g. John is both a noun and a proper noun
	private _secondaryNLP;
	private _ready: boolean;

	constructor() {
		this._ready = false;
		this._mainNLP = wink( model );
		this._secondaryNLP = wink (model);
		this._customPatterns = [];
		this._secondaryCustomPatterns = []
	}

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
	}

	injectSettings?(setting: SettingInterface){
		this._setting = setting;
	}

	init(){
		this.loadPatterns();
		this._mainNLP.learnCustomEntities(this._customPatterns);
		this._secondaryNLP.learnCustomEntities(this._secondaryCustomPatterns)
		this._ready = true;
	}

	loadPatterns(){
		this._customPatterns.push(
			{name: "date", patterns: ["DATE", "on DATE"]},
			// 12th of Jan 2023, second of may
			{name: "ordinalDate", patterns: ["[ORDINAL] [|ADP] [|DATE|may|march] [|DATE]"]},
			// July the third
			{name: "ordinalDateReverse", patterns: [" [|DATE] [DATE|may|march] [|DET] [ORDINAL]"]},
		);
		this._customPatterns.push(
			{name: "timeRange", patterns: ["[from] [TIME|CARDINAL|NUM] [|am|pm] [to] [TIME|CARDINAL|NUM] [|am|pm]", "[TIME|CARDINAL] [-|/] [TIME|CARDINAL]"]},
			{name: "exactTime", patterns: ["[at|for] [CARDINAL|TIME]"]}
		)
		this._customPatterns.push({name: "intentionalVerb", patterns: ["[|AUX] [VERB] [|DET] [|ADP|at] [|PRON] [|DET] [|ADJ] [NOUN] [|NOUN]"]});
		this._customPatterns.push({name: "purpose", patterns: ["[about|regarding|concerning|for] [|DET] [|PRON] [|ADJ] [NOUN] [|NOUN|ADJ|CCONJ] [|NOUN|CCONJ|PRON] [|NOUN|ADJ]",
				"to VERB [|PRON|DET] [|ADJ] NOUN [|NOUN|ADJ|CCONJ] [|NOUN|CCONJ|PRON] [|NOUN|ADJ]"]});
		// The secondaryCustomPatterns exist to manage possible overlap between entities
		this._secondaryCustomPatterns.push({name: "eventNoun", patterns: Media.nounPatters});
		this._secondaryCustomPatterns.push({name: "properName", patterns: Media.properNamePatterns});
	}

	process(sentence: Sentence): {selection: {value, index, type}[], event: Event} | null{
		if(!this._ready){
			console.warn("Not able to process: NLP module not ready");
			return null;
		}

		if (this.bannedPattern(sentence)) return null;

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

		// First match - Syntactic check
		let matchedEvent = eventController.syntacticCheck(sentence);
		if (matchedEvent != null && matchedEvent.processed == true) return null;

		// If the syntax check fails we'll need to perform a semantic check, once
		// all the sentence elements are defined
		const auxiliaryStructures = this.getAuxiliaryStructures(sentence);
		const mainCustomEntities = auxiliaryStructures.mainCustomEntities;
		const secondaryCustomEntities = auxiliaryStructures.secondaryCustomEntities;
		const caseInsensitiveText = auxiliaryStructures.caseInsensitiveText;
		const tokens = auxiliaryStructures.tokens;
		const pos = auxiliaryStructures.pos;

		if (tokens == undefined || pos == undefined) return null;

		const dates = this.filterDates(mainCustomEntities);
		if (dates.length == 0) return null;

		// Select as useful date the first encountered
		const selectedDate = dates[0];
		const selectedDateIndex = caseInsensitiveText.indexOf(selectedDate.value);

		if (this._setting.customSymbol != "" ){
			const customEvent = this.getCustomEvent(sentence);
			if (customEvent){
				const cleanDates = this.cleanJunkDates(dates);
				const dateRange = this.parseDates(cleanDates);
				if (!dateRange) return;
				sentence.injectSemanticFields(dateRange.start, dateRange.end, customEvent.value)
				matchedEvent = eventController.semanticCheck(sentence);
				// Matched semantic check;
				if (matchedEvent) return null;
				const selection = this.getSelectionArray(sentence.value, cleanDates, customEvent);
				const event = eventController.createNewEvent(sentence);

				return {
					selection,
					event
				}
			}
		}

		// Find purpose in text
		// e.g. "to discuss finances"
		const purpose = this.filterPurpose(caseInsensitiveText, mainCustomEntities, tokens);
		// Find proper names
		const properNames = this.filterProperNames(secondaryCustomEntities);
		// Find nouns that conform to the concept of event
		// e.g. meetings, shows etc
		// The function takes as argument the purpose string in order to avoid entity overlap
		const eventNouns = this.filterEventNoun(secondaryCustomEntities, purpose == null ? [] : purpose.nouns);

		// Select an event noun from the list of event nouns
		let selectedEventNoun = this.selectEventNoun(caseInsensitiveText, eventNouns, selectedDateIndex);

		let selectedIntentionalVerb : {value, index, type, verb, noun};
		if (selectedEventNoun.index == -1){
			// If an event-related noun is not found, it's worth looking for verbs that express an intention
			// e.g. I'll meet John tomorrow
			selectedIntentionalVerb = this.selectIntentionalVerb(mainCustomEntities, tokens, caseInsensitiveText, selectedDateIndex);

			if (selectedIntentionalVerb.index == -1) return null;
			selectedEventNoun = {
				value: selectedIntentionalVerb.noun,
				index: caseInsensitiveText.indexOf(selectedIntentionalVerb.noun),
				type: "eventNoun"
			};
		}

		// Select proper name from the found ones
		const selectedProperName = this.selectProperName(sentence.value, properNames, selectedEventNoun, selectedIntentionalVerb);

		// Find possible common noun associated to the event noun (board meeting)
		const backwardsAdjAttributes = this.selectAdjAttributes(tokens, pos, selectedEventNoun, selectedProperName, selectedDateIndex, true);

		const forwardAdjAttributes = this.selectAdjAttributes(tokens, pos, selectedEventNoun, selectedProperName, selectedDateIndex);

		// Clean extra dates
		const cleanDates = this.cleanJunkDates(dates);

		// Fill selection array
		// The selection array is the object that represent what items will be either highlighted or underlined
		const selection = this.getSelectionArray(caseInsensitiveText, cleanDates, selectedEventNoun, backwardsAdjAttributes, forwardAdjAttributes, selectedProperName, purpose);

		// From natural language to dates
		const dateRange = this.parseDates(cleanDates);

		if (dateRange == undefined) return;

		// Semantic check
		if(matchedEvent == null){
			sentence.injectSemanticFields(dateRange.start, dateRange.end, selectedEventNoun.value)
			sentence.eventNoun = this.getEventTitle(backwardsAdjAttributes, forwardAdjAttributes, selectedEventNoun, selectedProperName, purpose);
			matchedEvent = eventController.semanticCheck(sentence);
		}

		// Semantic check successful
		if (matchedEvent != null && matchedEvent.processed == true) return null;

		// Semantic check unsuccessful -> new event
		if (matchedEvent == null){
			const event = eventController.createNewEvent(sentence);
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

	private getAuxiliaryStructures(sentence: Sentence): {caseInsensitiveText: string, mainCustomEntities: CustomEntities, secondaryCustomEntities: CustomEntities, tokens: Tokens, pos: PartOfSpeech[]} {
		const caseInsensitiveText = sentence.value.toLowerCase();
		const mainDoc = this._mainNLP.readDoc(caseInsensitiveText);
		const secondaryDoc = this._secondaryNLP.readDoc(caseInsensitiveText);
		const mainCustomEntities = mainDoc.customEntities();
		const secondaryCustomEntities = secondaryDoc.customEntities();
		const tokens = mainDoc.tokens();
		const pos = tokens.out(this._mainNLP.its.pos);
		return {caseInsensitiveText, mainCustomEntities, secondaryCustomEntities, tokens, pos};
	}

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
		const its = this._secondaryNLP.its;
		return customEntities.out(its.detail).filter(pos => (pos as unknown as Detail).type == "properName") as Detail[];
	}

	private filterEventNoun(customEntities: CustomEntities, purposeNouns: string[]): Detail[] {
		const its = this._mainNLP.its;
		return customEntities.out(its.detail).filter(pos => {
			const isEventNoun = (pos as unknown as Detail).type == "eventNoun";
			const isDifferentFromPurposeNouns = purposeNouns.filter(purposeNoun => purposeNoun == (pos as unknown as Detail).value).length == 0;
			return isEventNoun && isDifferentFromPurposeNouns;
		}) as Detail[];
	}

	private filterPurpose(text: string, customEntities: CustomEntities, tokens: Tokens): {value, index, type, nouns} {
		const its = this._secondaryNLP.its;
		const purpose = customEntities.out(its.detail).filter(pos => ((pos as unknown as Detail).type == "purpose")).first() as Detail;
		if (purpose == undefined) return null;
		const pos = tokens.out(its.pos);
		const tokenValues = tokens.out();
		const nouns = [];
		pos.forEach((pos, i) => {
			if (pos == "NOUN" && purpose.value.split(" ").filter(purposeItem => purposeItem == tokenValues[i]).length > 0) nouns.push(tokenValues[i]);
		})

		const purposeIndex = text.indexOf(purpose.value);
		return {
			value: purpose.value,
			index: purposeIndex,
			type: "purpose",
			nouns
		};
	}

	private selectIntentionalVerb(customEntities: CustomEntities, tokens: Tokens, text: string, selectedDateIndex: number): {value, index, type, verb, noun} {
		const selectedIntentionalVerb = {
			value: "",
			index: -1,
			type: "",
			verb: "",
			noun: ""
		};
		const intentionalVerbs = customEntities.out(this._mainNLP.its.detail).filter(detail => ((detail as unknown as Detail).type == "intentionalVerb")) as Detail[];
		if (intentionalVerbs.length == 0) return selectedIntentionalVerb;
		let verbDistance = 1000;
		intentionalVerbs.forEach(intentionalVerb => {
			// Remove potential aux
			intentionalVerb.value = intentionalVerb.value.replaceAll("'ll", "");
			const vIndex = text.indexOf(intentionalVerb.value);
			const distanceFromDate = Math.abs(vIndex - selectedDateIndex);
			if (distanceFromDate < verbDistance){
				verbDistance = distanceFromDate;
				selectedIntentionalVerb.value = intentionalVerb.value;
				selectedIntentionalVerb.index = vIndex;
				selectedIntentionalVerb.type = intentionalVerb.type;
			}
		})

		const pos = tokens.out(this._mainNLP.its.pos)
		const tokenValue = tokens.out();
		const verbIndex = pos.indexOf("VERB");
		selectedIntentionalVerb.verb = tokenValue[verbIndex];

		selectedIntentionalVerb.noun = selectedIntentionalVerb.value.split(" ").last();
		return selectedIntentionalVerb;
	}

	private selectEventNoun(text, eventNouns, selectedVerbIndex): {value: string, index: number, type: string} {
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
		return selectedEventNoun;
	}


	// The idea:
	// Look for [|ADP] [...NOUN]
	// backwards flag -> looks back
	private selectAdjAttributes(tokens, pos, selectedEventNoun, selectedProperName, selectedDateIndex, backward = false) : {value: string, index: number, type: string}[] | null {
		let selectedAdjAttributes: { value, index, type }[] = [];
		let adjOffset = 1;
		if (backward) adjOffset = -1;
		const stringTokens = tokens.out();
		const eventNounTokenIndex = stringTokens.indexOf(selectedEventNoun.value);
		if (eventNounTokenIndex <= 0) return null;
		let cumulativeIndex = selectedEventNoun.index;
		while (pos[eventNounTokenIndex + adjOffset] == "NOUN" || pos[eventNounTokenIndex + adjOffset] == "ADJ" || pos[eventNounTokenIndex + adjOffset] == "ADP"
		|| pos[eventNounTokenIndex + adjOffset] == "PRON" || pos[eventNounTokenIndex + adjOffset] == "PART"){
			const adjWord = stringTokens[eventNounTokenIndex + adjOffset];
			if(selectedProperName != null && adjWord == selectedProperName.value) return null;
			const selectedAdjAttributedIndex = backward ? cumulativeIndex - (adjWord.length + 1) : cumulativeIndex + (adjWord.length + 1);
			cumulativeIndex = selectedAdjAttributedIndex;
			if (selectedAdjAttributedIndex == selectedDateIndex) return null;
			const selectedAdjAttribute = {
				value: "",
				index: -1,
				type: ""
			};
			selectedAdjAttribute.value = adjWord;
			selectedAdjAttribute.index = selectedAdjAttributedIndex
			selectedAdjAttribute.type = pos[eventNounTokenIndex + adjOffset];
			selectedAdjAttributes.push(selectedAdjAttribute);
			if (backward) adjOffset -= 1;
			else adjOffset += 1;
		}

		if (backward) selectedAdjAttributes = selectedAdjAttributes.reverse();

		// The last element can't be an ADP, PRON or a PART
		let lastElement = selectedAdjAttributes[selectedAdjAttributes.length - 1];
		while (selectedAdjAttributes.length > 0 && (lastElement.type == "ADP" || lastElement.type == "PRON" || lastElement.type == "PART")){
			selectedAdjAttributes.pop();
			lastElement = selectedAdjAttributes[selectedAdjAttributes.length - 1];
		}

		if (selectedAdjAttributes.length == 0) return null;

		return selectedAdjAttributes;
	}

	private selectProperName(text, properNames, selectedEventNoun, selectedIntentionalVerb) : {value: string, index: number, type: string, parsedValue: string} | null {
		const selectedProperName = {
			value: "",
			index: -1,
			type: "",
			parsedValue: ""
		};

		let properNameDistance = 1000;
		let hasAdp = false;
		let adp;
		properNames.forEach(properName => {
			const pIndex = text.toLowerCase().indexOf(properName.value);
			let caseSensitiveFirstChar = text[pIndex];
			// Checking ad-positions
			const splitValue = properName.value.split(" ");
			adp = splitValue.length == 1 ? undefined : properName.value.split(" ")[0];
			if (adp != undefined) hasAdp = true;
			if (hasAdp) caseSensitiveFirstChar = text[pIndex + adp.length + 1];
			// Excluding lower case proper names to confuse words like "amber" and "Amber"
			if (Misc.isLowerCase(caseSensitiveFirstChar)) return;
			const distanceFromEventNoun = Math.abs(pIndex - selectedEventNoun.index);
			if (distanceFromEventNoun < properNameDistance){
				properNameDistance = distanceFromEventNoun;
				selectedProperName.value = hasAdp ? splitValue[1] : splitValue[0];
				selectedProperName.index = pIndex;
				selectedProperName.type = properName.type;
			}
		});
		if (selectedProperName.index == -1) return null

		// In intentional verbs it's possible that the noun matching the pattern is a proper name
		// In this case it's necessary to discard the proper name found
		if (selectedEventNoun != undefined && selectedEventNoun.value.toLowerCase() == selectedEventNoun.value){
			if (selectedIntentionalVerb != undefined && selectedIntentionalVerb.index != -1){
				selectedEventNoun.value = `${selectedIntentionalVerb.verb} ${selectedIntentionalVerb.noun}`
			}
			return null;
		}

		selectedProperName.parsedValue = selectedProperName.value.charAt(0).toUpperCase() + selectedProperName.value.slice(1);
		if (!hasAdp) selectedProperName.parsedValue = `with ${selectedProperName.parsedValue}`;
		else selectedProperName.parsedValue = `${adp} ${selectedProperName.parsedValue}`

		return selectedProperName;
	}

	private getSelectionArray(text: string, dates: {value, index, type}[], selectedEventNoun: {value, index, type}, backwardsAdjAttributes?: {value, index, type}[],
								forwardAdjAttributes?: {value, index, type}[],  selectedProperName?: {value, index, type}, purpose?: {value, index, type}): {value, index, type}[] {
		const selection = []

		dates.forEach(date => {
			const dateIndex = text.indexOf(date.value);
			selection.push({value: date.value, index: dateIndex, type: date.type});
		})

		if (selectedEventNoun) selection.push(selectedEventNoun);
		if (selectedProperName) selection.push(selectedProperName);
		if (backwardsAdjAttributes){
			backwardsAdjAttributes.forEach(backwardsAdjAttribute => {
				selection.push(backwardsAdjAttribute);
			})
		}
		if (forwardAdjAttributes){
			forwardAdjAttributes.forEach(forwardAdjAttribute => {
				selection.push(forwardAdjAttribute);
			})
		}
		if (purpose) selection.push(purpose);

		// Order by index (builder.add needs to be called with increasing values)
		return selection.sort((a, b) => a.index - b.index);
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
		if(dateComponents.length > 1)
			cleanDates = cleanDates.filter(d => ((timePatterns.indexOf(d.type) > -1) || (d.value == dateComponents[0].value)));
		if(times.length > 1)
			cleanDates = cleanDates.filter(d =>  ((dateComponentPatterns.indexOf(d.type) > -1) || (d.value == times[0].value)));
		return cleanDates;
	}

	private parseDates(dates): DateRange {
		const timeRelatedString = dates.map(e => e.value).toString().replaceAll(",", " ");
				if (timeRelatedString.indexOf("%") > - 1) return undefined;
		const parsed = smartDateParser.parse(timeRelatedString) as ParsedResult[];
		return smartDateParser.getDates(parsed);
	}

	private getEventTitle(backwardsAdjAttributes, forwardAdjAttributes, selectedEventNoun, selectedProperName, purpose): string {
		let eventTitle = "";
		if (backwardsAdjAttributes != null){
			backwardsAdjAttributes.forEach(backwardsAdjAttribute => {
				eventTitle += `${backwardsAdjAttribute.value} `
			})
		}
		eventTitle += selectedEventNoun.value;
		if (forwardAdjAttributes != null){
			eventTitle += " "
			forwardAdjAttributes.forEach(forwardAdjAttribute => {
				eventTitle += `${forwardAdjAttribute.value} `
			})
		}
		if (selectedProperName != null) eventTitle += ` ${selectedProperName.parsedValue}`
		if (purpose != null) eventTitle += ` ${purpose.value}`
		return eventTitle;
	}

	private bannedPattern(sentence: Sentence) {
		// Consider giving the possibility to specify some patterns that the user dont want to match
		// e.g. [something](...%20The...)
		// Forbid %20th
		if(!this._setting.bannedPatterns) return false;
		return this._setting.bannedPatterns.some(bannedPattern => sentence.value.indexOf(bannedPattern) > -1);
	}

	private getCustomEvent(sentence: Sentence) {
		const chars = sentence.value.split("");
		let startIndex;
		let endIndex;
		for (let i=0; i<sentence.value.length - this._setting.customSymbol.length; i++){
			const substring = sentence.value.slice(i, i + this._setting.customSymbol.length);
			if (substring != this._setting.customSymbol) continue;
			if (startIndex == undefined) startIndex = i;
			else endIndex = i;
		}
		if (!endIndex) return;
		return {
			value: sentence.value.slice(startIndex + this._setting.customSymbol.length, endIndex),
			index: startIndex,
			type: "customEvent"
		}

	}
}

const nplController = new NlpController();
export default nplController;
