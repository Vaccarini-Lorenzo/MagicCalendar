import SimplifiedFile from "./simplifiedFile";

export default class Event {
	// Meeting with John
	subject: string;
	// UUID
	hash: number;
	dateString: string;
	startDate: Date;
	endDate: Date;
	file: SimplifiedFile;
	calendar?: string;

	constructor(dateString: string, subject: string) {
		this.dateString = dateString;
		this.subject = subject;
		this.parseDates();
		this.hash = this.computeHash();
	}

	// Probably this is deprecated.
	// When the NPL finds an event it will parse it accordingly to the type (DATE, TIME, customDate etc)
	private parseDates(){
		const splitted = this.subject.slice(1).split("/")
		const completeDateRegex = /#\d{4}-\d{2}-\d{2}\/\d{2}-\d{2}\/\d{2}-\d{2}\/(.)*/;
		const halfDateRegex = /#\d{4}-\d{2}-\d{2}\/\d{2}-\d{2}\/(.)*/;
		//const onlyDateRegex = /#\d{4}-\d{2}-\d{2}\/(.)*/;

		let startHourComponents = ["00", "00"];
		let endHourComponents = ["23", "59"];
		if (this.subject.match(completeDateRegex)){
			startHourComponents = splitted[1].split("-");
			endHourComponents = splitted[2].split("-");
		}
		else if (this.subject.match(halfDateRegex)){
			startHourComponents = splitted[1].split("-");
			endHourComponents = ["23", "59"];
		}
		const dateComponents = splitted[0].split("-");

		this.startDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]),
			Number(startHourComponents[0]), Number(startHourComponents[1]));
		this.endDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]),
			Number(endHourComponents[0]), Number(endHourComponents[1]));
	}

	getDescription(): string {
		return "reference: " + this.file.name;
	}

	private computeHash(): number{
		const tagProperties = this.subject + this.startDate.toISOString() + this.endDate.toISOString();
		let hash = 0,
			i, chr;
		if (tagProperties.length === 0) return hash;
		for (i = 0; i < tagProperties.length; i++) {
			chr = tagProperties.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}
}
