import wink from "wink-nlp";
import model from "wink-eng-lite-web-model";
import {readFileSync} from "fs";

class NPLController{
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
		const datePatternPath = `${this._pluginPath}/.patterns/date_patterns.txt`
		const hourPatternPath = `${this._pluginPath}/.patterns/hour_patterns.txt`
		const dateData = readFileSync(datePatternPath);
		const parsedDates = JSON.parse(dateData.toString());
		const hourData = readFileSync(hourPatternPath);
		const parsedHours = JSON.parse(hourData.toString());
		this._customPatterns = [{name: "customDate", patterns: parsedDates}, {name: "customHour", patterns: parsedHours}]
		this._customPatterns.push({name: "date", patterns: ["DATE"]});
		this._customPatterns.push({name: "time", patterns: ["TIME"]});
		this._customPatterns.push({name: "duration", patterns: ["DURATION"]});
	}

	process(text: string): string | null {
		if(!this._ready){
			console.log("NPL not ready");
			return;
		}
		const its = this._nlp.its;
		const doc = this._nlp.readDoc(text);
		const match = doc.customEntities().out(its.value);
		return match.length == 0 ? null : match[0];
		//doc.sentences().each(sentence => sentence.customEntities().each(entity => console.log(entity.out(its.detail))));
		//doc.customEntities().each(e => e.markup(`<span class='${e.out(its.type)} entity'>`, `</span>`));
		//console.log(doc.out(its.markedUpText))
		//doc.sentences().each(sentence => sentence.customEntities().each(entity => console.log(console.log(entity.parentSentence().out()))));
		//.filter(entity => isDateTime[entity.out(its.type)])
		//.each(date => console.log(date.out()));
		/*
		doc
			.sentences()
			.each(sentence => {
				sentence
					.entities()
					.filter(entity => isDateTime[entity.out(its.type)])
					.each(date => console.log(sentence.out() + " - "));
			})

		 */
		// Return the marked up text as html.
		//console.log(doc.out(its.markedUpText));
	}
}

const nplController = new NPLController();
export default nplController;
