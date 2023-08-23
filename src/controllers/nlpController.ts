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

class NlpController {
	private _customPatterns: {name, patterns}[];
	private _pluginPath: string;
	private _nlp;
	private _ready: boolean;
	private test_list_pos: string[];
	private nouns: string[];
	private test_list_entities: string[];
	private map: Map<string[], string>;

	constructor() {
		this._ready = false;
		this._nlp = wink( model );
		this.test_list_pos = [];
		this.test_list_entities = [];
		this.map = new Map();
		this.nouns = [];
	}

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
	}

	init(){
		this.loadPatterns();
		this._nlp.learnCustomEntities(this._customPatterns);
		this._ready = true;
	}

	loadPatterns(){
		const nounPatternPath = `${this._pluginPath}/.noun_patterns.txt`
		const properNamePatternPath = `${this._pluginPath}/.proper_name_patterns.txt`

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
		this._customPatterns.push({name: "intentionalVerb", patterns: ["[|AUX] [VERB] [|ADP] [|DET] [NOUN]"]});
		this._customPatterns.push({name: "eventNoun", patterns: parsedNouns});
	}

	process(sentence: Sentence): {selection: {value, index, type}[], event: Event} | null{
		if(!this._ready){
			console.warn("Not able to process: NLP module not ready");
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

		// First match - Syntactic check
		let matchedEvent = eventController.syntacticCheck(sentence);
		if (matchedEvent != null && matchedEvent.processed == true) return null;

		// If the syntax check fails we'll need to perform a semantic check, once
		// all the sentence elements are defined
		const auxiliaryStructures = this.getAuxiliaryStructures(sentence);
		const customEntities = auxiliaryStructures.customEntities;
		const caseInsensitiveText = auxiliaryStructures.caseInsensitiveText;
		const tokens = auxiliaryStructures.tokens;
		const pos = auxiliaryStructures.pos;

		// Filter customEntities (or customVerbEntities) to find the entity of the right type
		// The following structures are [{value, type}]
		const dates = this.filterDates(customEntities);
		const properNames = this.filterProperNames(customEntities);
		const eventNouns = this.filterEventNoun(customEntities);

		if (dates.length == 0) return null;

		const selectedDateIndex = caseInsensitiveText.indexOf(dates[0].value);
		let selectedEventNoun = this.findEventNoun(caseInsensitiveText, eventNouns, selectedDateIndex );
		let selectedIntentionalVerb : {value, index, type, noun};
		if (selectedEventNoun.index == -1){
			selectedIntentionalVerb = this.findIntentionalVerb(auxiliaryStructures.customEntities, caseInsensitiveText, selectedDateIndex);
			if (selectedIntentionalVerb.index == -1) return null;
			selectedEventNoun = {
				value: selectedIntentionalVerb.noun,
				index: auxiliaryStructures.caseInsensitiveText.indexOf(selectedIntentionalVerb.noun),
				type: "eventNoun"
			};
		}

		// Find possible common noun associated to the event noun (board meeting)
		const backwardsAdjAttributes = this.findAdjAttributes(tokens, pos, selectedEventNoun, selectedEventNoun.index, selectedDateIndex, true);

		const forwardAdjAttributes = this.findAdjAttributes(tokens, pos, selectedEventNoun, selectedEventNoun.index, selectedDateIndex);

		// Find possible proper names (John)
		const selectedProperName = this.findProperName(sentence.value, properNames, selectedEventNoun.index);

		const cleanDates = this.cleanJunkDates(dates);
		// Fill selection array
		const selection = this.getSelectionArray(caseInsensitiveText, cleanDates, selectedEventNoun, backwardsAdjAttributes, forwardAdjAttributes, selectedProperName);

		// From natural language to dates
		const dateRange = this.parseDates(cleanDates);

		if (dateRange == undefined) return;

		// Semantic check
		if(matchedEvent == null){
			sentence.injectSemanticFields(dateRange.start, dateRange.end, selectedEventNoun.value)
			const eventTitle = this.getEventTitle(backwardsAdjAttributes, forwardAdjAttributes, selectedEventNoun, selectedProperName);
			sentence.eventNoun = eventTitle;
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

	private getAuxiliaryStructures(sentence: Sentence): {caseInsensitiveText: string, customEntities: CustomEntities, tokens: Tokens, pos: PartOfSpeech[]} {
		const caseInsensitiveText = sentence.value.toLowerCase();
		const doc = this._nlp.readDoc(caseInsensitiveText);
		const customEntities = doc.customEntities();
		const tokens = doc.tokens();
		const pos = tokens.out(this._nlp.its.pos);
		return {caseInsensitiveText, customEntities, tokens, pos};
	}

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

	private findIntentionalVerb(customEntities: CustomEntities, text: string, selectedDateIndex: number): {value, index, type, noun} {
		const selectedIntentionalVerb = {
			value: "",
			index: -1,
			type: "",
			noun: ""
		};
		const intentionalVerbs = customEntities.out(this._nlp.its.detail).filter(pos => ((pos as unknown as Detail).type == "intentionalVerb")) as Detail[];
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
		return selectedEventNoun;
	}

	// The idea:
	// look for
	private findPurpose(){

	}

	// The idea:
	// Look for [|ADP] [...NOUN]
	// backwards flag -> looks back
	private findAdjAttributes(tokens, pos, eventNoun, eventNounIndex, selectedDateIndex, backward = false) : {value: string, index: number, type: string}[] | null {
		const selectedAdjAttributes: { value, index, type }[] = [];
		let adjOffset = 1;
		if (backward) adjOffset = -1;
		const stringTokens = tokens.out();
		const eventNounTokenIndex = stringTokens.indexOf(eventNoun.value);
		if (eventNounTokenIndex <= 0) return null;
		let cumulativeIndex = 0;
		while (pos[eventNounTokenIndex + adjOffset] == "NOUN" || pos[eventNounTokenIndex + adjOffset] == "ADJ" || pos[eventNounTokenIndex + adjOffset] == "ADP" || pos[eventNounTokenIndex + adjOffset] == "PRON"){
			const adjWord = stringTokens[eventNounTokenIndex + adjOffset];
			const selectedAdjAttributedIndex = cumulativeIndex + (backward ? eventNounIndex - (adjWord.length + 1) : eventNounIndex + (adjWord.length + 1));
			cumulativeIndex = selectedAdjAttributedIndex;
			// If the common noun found is the selected date, returns
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

		if (selectedAdjAttributes.length == 0) return null;

		// The last element can't be an ADP or a PRON
		while (selectedAdjAttributes[selectedAdjAttributes.length - 1].type == "ADP" || selectedAdjAttributes[selectedAdjAttributes.length - 1].type == "PRON") selectedAdjAttributes.pop();

		return selectedAdjAttributes;
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
			// Checking ad-positions
			const adp = properName.value.split(" ").length == 1 ? undefined : properName.value.split(" ")[0];
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
		});
		return selectedProperName.index == -1 ? null : selectedProperName;
	}

	private getSelectionArray(text: string, dates: {value, index, type}[], selectedEventNoun: {value, index, type}, backwardsAdjAttributes: {value, index, type}[], forwardAdjAttributes: {value, index, type}[],  selectedProperName: {value, index, type}): {value, index, type}[] {
		const selection = []
		dates.forEach(date => {
			const dateIndex = text.indexOf(date.value);
			selection.push({value: date.value, index: dateIndex, type: date.type});
		})
		if (selectedEventNoun!= null) selection.push(selectedEventNoun);
		if (selectedProperName!= null) selection.push(selectedProperName);
		if (backwardsAdjAttributes != null){
			backwardsAdjAttributes.forEach(backwardsAdjAttribute => {
				selection.push(backwardsAdjAttribute);
			})
		}
		if (forwardAdjAttributes != null){
			forwardAdjAttributes.forEach(forwardAdjAttribute => {
				selection.push(forwardAdjAttribute);
			})
		}
		console.log(selection);
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
		if(dateComponents.length > 1)
			cleanDates = cleanDates.filter(d => ((timePatterns.indexOf(d.type) > -1) || (d.value == dateComponents[0].value)));
		if(times.length > 1)
			cleanDates = cleanDates.filter(d =>  ((dateComponentPatterns.indexOf(d.type) > -1) || (d.value == times[0].value)));
		return cleanDates;
	}

	private parseDates(dates): DateRange {
		const timeRelatedString = dates.map(e => e.value).toString().replaceAll(",", " ");
		const parsed = smartDateParser.parse(timeRelatedString) as ParsedResult[];
		return smartDateParser.getDates(parsed);
	}

	test(sentence: Sentence) {
		const text = "virtual meeting with Sarah to brainstorm project ideas.\n" +
			"yoga class\n" +
			"visit the dentist for a check-up.\n" +
			"go hiking with a group of friends at the local trail.\n" +
			"start a week-long online coding course.\n" +
			"celebrate Mom's birthday with a family dinner.\n" +
			"attend a conference on AI and its applications.\n" +
			"meet John for a coffee catch-up in the afternoon.\n" +
			"volunteer at the local animal shelter.\n" +
			"host a barbecue party for my neighbors.\n" +
			"have a video call with the book club to discuss the latest novel.\n" +
			"attend a webinar on time management.\n" +
			"fly out for a business trip to attend a conference.\n" +
			"have a movie night with friends, watching a classic film.\n" +
			"start a painting workshop that runs for a month.\n" +
			"meet with my financial advisor to review investments.\n" +
			"go to a live music concert featuring local artists.\n" +
			"have a job interview at XYZ Company.\n" +
			"visit my parents for a family reunion.\n" +
			"participate in a charity run for a good cause.\n" +
			"have a virtual language exchange session to practice French.\n" +
			"take a cooking class to learn how to make sushi.\n" +
			"have a meeting with the homeowners' association.\n" +
			"have a video call with my pen pal from another country.\n" +
			"attend a photography workshop in the city.\n" +
			"have a doctor's appointment for a regular check-up.\n" +
			"meet with the gardening club to plan our community garden.\n" +
			"have a movie night at home, watching new releases.\n" +
			"attend a workshop on building effective communication skills.\n" +
			"start a dance class to learn salsa.\n" +
			"go to a tech meetup to network with professionals.\n" +
			"visit the art museum downtown to explore the exhibits.\n" +
			"have a picnic in the park with friends.\n" +
			"attend a webinar about sustainable living practices.\n" +
			"go to a live theater performance of a classic play.\n" +
			"have a Skype call with my best friend who lives abroad.\n" +
			"have a job interview for a position I'm excited about.\n" +
			"have a meeting with the local community center to discuss volunteering opportunities.\n" +
			"attend a workshop on meditation and mindfulness.\n" +
			"go to a wine tasting event at a vineyard.\n" +
			"participate in a charity bake sale to support children's education.\n" +
			"have a video call with my mentor to discuss career growth.\n" +
			"go on a road trip to a nearby scenic destination.\n" +
			"have a doctor's appointment for a vaccine booster.\n" +
			"have a virtual meeting with a potential freelance client.\n" +
			"visit an antique fair to explore unique finds.\n" +
			"have a networking lunch with professionals in my field.\n" +
			"start a creative writing workshop.\n" +
			"attend a seminar on personal finance management.\n" +
			"have a video call with my study group for an upcoming exam.\n" +
			"go to the cinema with Alice to watch the new Spider-Man movie.\n" +
			"have an appointment with my dentist at 10:30 am.\n" +
			"go to a concert with my friends. It’s a tribute band of Queen.\n" +
			"have a meeting with my boss to review my performance.\n" +
			"start my new job at Microsoft. I’m very excited about it.\n" +
			"have a doctor's appointment on Monday at 10am.\n" +
			"going to the beach with my family on Saturday.\n" +
			"have a meeting with my team on Tuesday at 2pm.\n" +
			"taking a cooking class on Thursday night.\n" +
			"going to the movies with my friends on Friday.\n" +
			"have a presentation to give at work on Monday.\n" +
			"going to a concert on Saturday night.\n" +
			"flying to New York on Friday morning.\n" +
			"having a birthday party for my daughter on Saturday afternoon.\n" +
			"going to the gym on Wednesday evening.\n" +
			"have a dentist appointment on Thursday morning.\n" +
			"going to the grocery store on Sunday afternoon.\n" +
			"meeting my friends for dinner on Friday night.\n" +
			"have a haircut appointment on Saturday morning.\n" +
			"going to the library on Tuesday afternoon.\n" +
			"going to the park with my dog on Sunday morning.\n" +
			"have a doctor's appointment on Monday at 11am.\n" +
			"going to the museum with my family on Saturday afternoon.\n" +
			"have a meeting with my boss on Tuesday at 3pm.\n" +
			"taking a yoga class on Thursday night.\n" +
			"have a presentation to give at work on Wednesday.\n" +
			"flying to Chicago on Friday morning.\n" +
			"having a birthday party for my son on Saturday afternoon.\n" +
			"have a doctor's appointment on Monday at 12pm.\n" +
			"have a meeting with my boss on Tuesday at 4pm.\n" +
			"taking a dance class on Thursday night.\n" +
			"have a presentation to give at work on Thursday.\n" +
			"flying to London on Friday morning.\n" +
			"having a birthday party for my spouse on Saturday afternoon.\n" +
			"going to the gym on Thursday evening.\n" +
			"have a dentist appointment on Friday morning.\n" +
			"have a doctor's appointment on Monday at 1pm.\n" +
			"going to the beach with my family on Saturday afternoon.\n" +
			"celebrate my birthday with my family on Saturday at a nice restaurant.\n" +
			"have a flight to New York on Monday morning for a business trip.\n" +
			"going to a wedding on Sunday afternoon with my partner.\n" +
			"have a yoga class every Wednesday at 8:00 am.\n" +
			"attend a conference on artificial intelligence on Thursday and Friday at the university.\n" +
			"have a doctor’s check-up on Tuesday at 9:15 am.\n" +
			"going to a Halloween party on October 31st with my friends.\n" +
			"have a piano lesson every Monday at 4:00 pm.\n" +
			"visit my grandparents on Sunday morning for brunch.\n" +
			"have a soccer match on Saturday at 3:00 pm with my team.\n" +
			"going to a comedy show on Friday night with my co-workers.\n" +
			"have a math test on Wednesday at 11:00 am.\n" +
			"skiing with my family.\n" +
			"book club meeting with my friends.\n" +
			"museum visit with my kids.\n" +
			"haircut appointment.\n" +
			"vacation to Paris.\n" +
			"dance class.\n" +
			"concert with my sister.\n" +
			"chemistry lab.\n" +
			"hiking with my dog.\n" +
			"pottery workshop with my mom.\n" +
			"karaoke night with my classmates.\n" +
			"history presentation.\n" +
			"shopping with my best friend.\n" +
			"guitar lesson.\n" +
			"barbecue with my neighbors.\n" +
			"Spanish quiz.\n" +
			"camping with my family.\n" +
			"meditation session.\n" +
			"theater play with my date.\n" +
			"physics exam.\n" +
			"fishing with my dad.\n" +
			"cooking class with my aunt.\n" +
			"basketball game with my brother.\n" +
			"interview for a new job.\n" +
			"beach day with my friends.\n" +
			"art class with my teacher.\n" +
			"carnival with my kids.\n" +
			"yoga class at the park.\n" +
			"anniversary dinner reservation.\n" +
			"volunteering at the local food bank.\n" +
			"team brainstorming session.\n" +
			"barbecue party at my place.\n" +
			"presentation at the conference.\n" +
			"vacation to Paris.\n" +
			"doctor's appointment.\n" +
			"project deadline.\n" +
			"theater performance.\n" +
			"photography workshop.\n" +
			"charity gala.\n" +
			"workshop on digital marketing.\n" +
			"family reunion.\n" +
			"business trip.\n" +
			"company picnic.\n" +
			"book club meeting.\n" +
			"charity run.\n" +
			"team-building retreat.\n" +
			"museum exhibit.\n" +
			"birthday party.\n" +
			"basketball game.\n" +
			"project presentation.\n" +
			"cooking class series.\n" +
			"workshop on time management.\n" +
			"visit to the botanical gardens.\n" +
			"board meeting.\n" +
			"tech conference.\n" +
			"hiking trip.\n" +
			"art gallery opening reception.\n" +
			"dentist appointment.\n" +
			"team presentation.\n" +
			"school play.\n" +
			"vacation.\n" +
			"music festival.\n" +
			"film screening.\n" +
			"workshop on negotiation skills.\n" +
			"job interview.\n" +
			"science fair.\n" +
			"conference.\n" +
			"beach cleanup event.\n" +
			"theater play.\n" +
			"wine tasting event.\n" +
			"doctor's appointment.\n" +
			"parent-teacher meetings.\n" +
			"webinar about personal finance.\n" +
			"job fair.\n" +
			"team's off-site retreat.\n" +
			"holiday market.\n" +
			"cooking competition.\n"
		const sentences = text.split("\n");
		sentences.forEach(sentence => {
			const caseInsensitiveText = sentence.toLowerCase();
			const doc = this._nlp.readDoc(caseInsensitiveText);
			const customEntities = doc.customEntities();
			const entities = doc.entities().out(this._nlp.its.detail);
			const dates = entities.filter(e => e.type == "DATE");
			const tokens = doc.tokens();
			const tokenValues = tokens.out();
			const pos = tokens.out(this._nlp.its.pos);
			pos.forEach((p, i) => {
				if (p == "PROPN"){
					const corrispectiveToken = tokenValues[i];
					const corrispectiveDateList = dates.filter(d => d.value == corrispectiveToken)
					if (corrispectiveDateList.length > 0){
						pos[i] = corrispectiveDateList[0].type;
					}
				}
				if (p == "PUNCT"){
					pos.remove(p);
				}
				if (p == "NOUN"){
					const corrispectiveToken = tokenValues[i];
					this.nouns.push(corrispectiveToken);
				}
			})
			this.test_list_pos.push(pos);
			this.map.set(pos, sentence);
		})
	}

	print() {
		console.log("POS list")
		console.log(this.test_list_pos);
		console.log(Array.from(this.map.entries()));
		console.log("Nouns")
		console.log(this.nouns);

	}

	private getEventTitle(backwardsAdjAttributes, forwardAdjAttributes, selectedEventNoun, selectedProperName): string {
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
		if (selectedProperName != null) eventTitle += ` ${selectedProperName.value}`
		return eventTitle;
	}
}

const nplController = new NlpController();
export default nplController;
