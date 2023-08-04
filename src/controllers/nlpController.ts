import wink from "wink-nlp";
import model from "wink-eng-lite-web-model";
import {readFileSync} from "fs";

class NlpController {
	private _customPatterns: {name, patterns}[];
	private _pluginPath: string;
	private _nlp;
	private _ready: boolean;

	constructor() {
		this._ready = false;
		this._nlp = wink( model );
		this._ready = true;
	}

	init(pluginPath: string){
		this._pluginPath = pluginPath;
		this.loadPatterns();
		this._nlp.learnCustomEntities(this._customPatterns);
	}

	loadPatterns(){
		// TODO: On the 18th is not recognized!!!

		const datePatternPath = `${this._pluginPath}/.patterns/date_patterns.txt`
		const hourPatternPath = `${this._pluginPath}/.patterns/hour_patterns.txt`
		const verbPatternPath = `${this._pluginPath}/.patterns/verb_patterns.txt`
		const nounPatternPath = `${this._pluginPath}/.patterns/noun_patterns.txt`

		const dateData = readFileSync(datePatternPath);
		const parsedDates = JSON.parse(dateData.toString());
		const hourData = readFileSync(hourPatternPath);
		const parsedHours = JSON.parse(hourData.toString());
		const verbData = readFileSync(verbPatternPath);
		const parsedVerbs = JSON.parse(verbData.toString());
		const nounData = readFileSync(nounPatternPath);
		const parsedNouns = JSON.parse(nounData.toString());
		this._customPatterns = [{name: "customDate", patterns: parsedDates}, {name: "customHour", patterns: parsedHours}]
		this._customPatterns.push({name: "date", patterns: ["DATE"]});
		this._customPatterns.push({name: "time", patterns: ["TIME"]});
		this._customPatterns.push({name: "duration", patterns: ["DURATION"]});
		this._customPatterns.push({name: "verb", patterns: parsedVerbs});
		this._customPatterns.push({name: "noun", patterns: parsedNouns});
	}


	// TODO: Check if there is a better way
	process(text: string): string[] {
		if(!this._ready){
			console.log("NPL not ready");
			return;
		}
		text = text.toLowerCase();
		const its = this._nlp.its;
		const doc = this._nlp.readDoc(text);
		const tokens = doc.tokens().out(its.value);
		const lemmas = doc.tokens().out(its.lemma);

		const lemmaMap = new Map<string, string>();
		tokens.forEach((token, i) => lemmaMap.set(lemmas[i], token));
		const lemmaText = doc.tokens().out(its.lemma).toString();
		const lemmaDoc = this._nlp.readDoc(lemmaText);
		const customEntities = doc.customEntities();
		const customVerbEntities = lemmaDoc.customEntities();
		const dates = customEntities.out(its.detail).filter(pos => (pos.type == "date") || (pos.type == "duration") || (pos.type == "time"));
		const nouns = customEntities.out(its.detail).filter(pos => (pos.type == "noun"));
		const lemmaVerbs = customVerbEntities.out(its.detail).filter(pos => (pos.type == "verb"));

		//console.log(`found ${dates.length} dates, ${lemmaVerbs.length} verbs, ${nouns.length} nouns,`)
		if (dates.length == 0 || lemmaVerbs.length == 0 || nouns.length == 0) return [];

		const selectedDate = dates[0].value;
		const selectedDateIndex = text.indexOf(dates[0].value);
		let selectedVerb = lemmaVerbs[0].value;
		let selectedMainNoun = nouns[0].value;
		let selectedSecondaryNoun = nouns[0].value;
		let matchIndexMap = new Map<string, number>();
		matchIndexMap.set(selectedDate, selectedDateIndex);
		matchIndexMap.set(selectedMainNoun, 0);
		matchIndexMap.set(selectedSecondaryNoun, 0);
		let verbDistance = 1000;
		let nounDistance = 1000;

		/*
		console.log("Lemma map");
		Array.from(lemmaMap.entries()).forEach(e => {
			console.log(e[0] + " -> " + e[1]);
		})

		 */
		lemmaVerbs.forEach(lemmaVerb => {
			const verb = lemmaMap.get(lemmaVerb.value);
			const vIndex = text.indexOf(verb);
			const distanceFromDate = Math.abs(vIndex - selectedDateIndex);
			if (distanceFromDate < verbDistance){
				verbDistance = distanceFromDate;
				selectedVerb = verb;
			}
		})
		
		nouns.forEach(n => {
			const nIndex = text.indexOf(n.value);
			const distanceFromVerb = Math.abs(nIndex - verbDistance);
			if (distanceFromVerb < nounDistance){
				selectedSecondaryNoun = selectedMainNoun;
				matchIndexMap.set(selectedSecondaryNoun, matchIndexMap.get(selectedMainNoun));
				selectedMainNoun = n.value;
				matchIndexMap.set(selectedMainNoun, nIndex);
				nounDistance = distanceFromVerb;
			}
		})

		const matchesSortedByIndex = new Map([...matchIndexMap.entries()].sort((a, b) => a[1] - b[1]));
		const matchesList = [];
		matchesSortedByIndex.forEach((m, v) => matchesList.push(v));

		return matchesList;

	}
}

const nplController = new NlpController();
export default nplController;
