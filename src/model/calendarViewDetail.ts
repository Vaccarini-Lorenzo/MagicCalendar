export class CalendarViewDetail {
	title: string;
	details?: string;
	row: number;
	fromCol: number;
	toCol: number;

	constructor(title: string, row: number, fromCol: number, toCol: number) {
		this.title = title;
		this.row = row;
		this.fromCol = fromCol;
		this.toCol = toCol;
	}
}
