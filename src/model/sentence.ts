export class Sentence {
	filePath: string;
	// The whole text value
	value: string;
	startDate: Date;
	endDate: Date;
	eventNoun: string;

	static pathSeparator = " - ";

	constructor(filePath: string, value: string) {
		this.filePath = filePath;
		this.value = value;
	}

	injectEntityFields(startDate: Date, endDate: Date, eventNoun: string){
		this.startDate = startDate;
		this.endDate = endDate;
		this.eventNoun = eventNoun;
	}

	toString(){
		return this.filePath + Sentence.pathSeparator + this.value;
	}
}
