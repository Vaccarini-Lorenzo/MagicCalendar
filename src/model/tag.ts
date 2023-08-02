import SimplifiedFile from "./simplifiedFile";

export default class Tag {
	tag: string;
	title: string;
	startDate: Date;
	endDate: Date;
	files: SimplifiedFile[];
	timer: NodeJS.Timer;
	timerDuration: number;
	callback: () => void;

	constructor(tag: string, timerDuration: number, callback: () => void) {
		this.tag = tag;
		this.parseDates();
		this.parseTitle();
		this.files = [];
		this.timerDuration = timerDuration;
		this.timer = setTimeout(callback, timerDuration);
	}

	private parseDates(){
		const splitted = this.tag.split("/")
		const dateComponents = splitted[1].split("-");
		let startHourComponents: string[];
		let endHourComponents: string[];

		// No checks, I'm assuming my regex works

		if (splitted.length == 5){
			startHourComponents = splitted[2].split("-");
			endHourComponents = splitted[3].split("-");
		}

		if (dateComponents.length == 3 && (startHourComponents == undefined || endHourComponents == undefined)){
			// All day event
			this.startDate = new Date(Number(dateComponents[0]), Number(dateComponents[1]), Number(dateComponents[2]));
			this.endDate = this.startDate;
			return;
		}

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
}
