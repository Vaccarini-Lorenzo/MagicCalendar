export class Sentence {
	filePath: string;
	// The whole text value
	value: string;
	startDate: Date;
	endDate: Date;
	duration: number;
	eventNoun: string;
	static pathSeparator = " - ";

	constructor(filePath: string, value: string) {
		this.filePath = filePath;
		this.value = value;
	}

	injectSemanticFields(startDate: Date, endDate: Date, eventNoun: string){
		this.startDate = startDate;
		this.endDate = endDate;
		this.eventNoun = eventNoun;
		this.computeDuration();
	}

	private computeDuration() {
		const diffMilli = this.endDate.getTime() - this.startDate.getTime();
		let diffMins = diffMilli / (1000 * 60);
		if (diffMins == 0){
			diffMins = 60;
			this.endDate = new Date(this.endDate.getTime() + 60 * 60 * 1000);
		}
		this.duration = diffMins;
	}

	toString(){
		return this.filePath + Sentence.pathSeparator + this.value;
	}


}
