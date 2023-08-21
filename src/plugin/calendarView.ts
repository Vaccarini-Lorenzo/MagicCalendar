import {MarkdownRenderChild} from "obsidian";

export class CalendarView extends MarkdownRenderChild {
	calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate};
	paletteNumber;

	constructor(containerEl: HTMLElement, calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate}) {
		super(containerEl);
		this.calendarViewData = calendarViewData;
		this.paletteNumber = 5;
	}

	onload() {
		const wrapper = this.containerEl.createEl("div");
		wrapper.addClass("table-wrapper")
		const table = wrapper.createEl("table");
		this.generateHeaders(table);
		this.generateRows(table)
		this.generateHeaders(table);
		this.containerEl.replaceWith(table);
	}

	private generateHeaders(table: HTMLTableElement){
		table.createEl("th")
		for (let column = 0; column < this.calendarViewData.numOfCols; column++){
			table.createEl("th")
		}
	}

	private generateRows(table: HTMLTableElement) {
		const date = this.calendarViewData.startDate;
		console.log(this.calendarViewData.calendarViewDetails);
		for (let rowIndex = 0; rowIndex < this.calendarViewData.numOfRows; rowIndex++){
			const needsLabel = this.calendarViewData.rowNeedsLabelMap.get(rowIndex);
			console.log(needsLabel);
			const row = this.initRow(table, date, needsLabel);
			this.fillEventsCells(row, rowIndex);
		}
	}

	private initRow(table: HTMLElement, date: Date, needsLabel: boolean): HTMLElement{
		const row = table.createEl("tr");
		const leftLabel = row.createEl("td");
		if (!needsLabel) return row;
		leftLabel.innerText  = date.toLocaleDateString();
		date.setDate(date.getDate() + 1);
		return row;
	}

	private fillEventsCells(row: HTMLElement, rowIndex: number) {
		const calendarEventDetails = this.calendarViewData.calendarViewDetails.filter(calendarViewDetail => calendarViewDetail.row == rowIndex);
		let columnIndex = 0;
		if (calendarEventDetails.length != 0){
			calendarEventDetails.sort(function(a, b){return a.fromCol - b.fromCol})

			calendarEventDetails.forEach(event => {
				for (let i = columnIndex; i < event.fromCol; i++){
					row.createEl("td");
				}
				const eventView = row.createEl("td");
				eventView.innerText = event.title;
				eventView.addClass(`palette-1`);
				eventView.setAttr("colspan", event.toCol - event.fromCol)
				columnIndex = event.toCol;
			})
		}

		for (let i = columnIndex; i < this.calendarViewData.numOfCols; i++){
			row.createEl("td");
		}
	}

}
