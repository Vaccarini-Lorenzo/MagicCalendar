export class CalendarViewDetail {
	title: string;
	details?: string;
	row: number;
	fromCol: number;
	toCol: number;
	cloudEventUUID: string;

	constructor(title: string, row: number, fromCol: number, toCol: number, cloudEventUUID: string) {
		this.title = title;
		this.row = row;
		this.fromCol = fromCol;
		this.toCol = toCol;
		this.cloudEventUUID = cloudEventUUID;
	}
}
