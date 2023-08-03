import SimplifiedFile from "./simplifiedFile";

export default class Tag {
	tag: string;
	hash: number;
	title: string;
	startDate: Date;
	endDate: Date;
	files: SimplifiedFile[];
	timer: NodeJS.Timer;
	timerDuration: number;
	calendar?: string;
	callback: () => void;

	constructor(tag: string, timerDuration: number, callback: () => void) {
		this.tag = tag;
		this.parseDates();
		this.parseTitle();
		this.files = [];
		this.timerDuration = timerDuration;
		this.timer = setTimeout(callback, timerDuration);
		this.hash = this.computeHash();
	}

	private parseDates(){
		const splitted = this.tag.slice(1).split("/")
		const completeDateRegex = /#\d{4}-\d{2}-\d{2}\/\d{2}-\d{2}\/\d{2}-\d{2}\/(.)*/;
		const halfDateRegex = /#\d{4}-\d{2}-\d{2}\/\d{2}-\d{2}\/(.)*/;
		//const onlyDateRegex = /#\d{4}-\d{2}-\d{2}\/(.)*/;

		let startHourComponents = ["00", "00"];
		let endHourComponents = ["23", "59"];
		if (this.tag.match(completeDateRegex)){
			startHourComponents = splitted[1].split("-");
			endHourComponents = splitted[2].split("-");
		}
		else if (this.tag.match(halfDateRegex)){
			startHourComponents = splitted[1].split("-");
			endHourComponents = ["23", "59"];
		}
		const dateComponents = splitted[0].split("-");

		console.log(dateComponents, startHourComponents, endHourComponents)

		this.startDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]),
			Number(startHourComponents[0]), Number(startHourComponents[1]));
		this.endDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]),
			Number(endHourComponents[0]), Number(endHourComponents[1]));
	}

	parseTitle(){
		const splitted = this.tag.split("/")
		this.title = splitted[splitted.length - 1].replace("_", " ");
	}

	resetTimer(){
		clearTimeout(this.timer);
	}

	updateTimer(duration: number){
		this.resetTimer();
		this.timer = setTimeout(this.callback, duration);
	}

	linkFile(file: SimplifiedFile){
		this.files.push(file);
	}

	getDescription(): string {
		let description = "reference: "
		this.files.forEach(file => description += `${file.name}, `);
		return description;
	}

	private computeHash(): number{
		const tagProperties = this.tag + this.startDate.toISOString() + this.endDate.toISOString();
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
