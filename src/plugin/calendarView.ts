import {MarkdownRenderChild} from "obsidian";

export class CalendarView extends MarkdownRenderChild {
	calendarViewData: {numOfCols, numOfRows, calendarViewDetails, startDate};
	paletteNumber;

	constructor(containerEl: HTMLElement, calendarViewData: {numOfCols, numOfRows, calendarViewDetails, startDate}) {
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
		for (let rowIndex = 0; rowIndex < this.calendarViewData.numOfRows; rowIndex++){
			const row = table.createEl("tr");
			const leftLabel = row.createEl("td");
			leftLabel.innerText  = date.toLocaleDateString();
			date.setDate(date.getDate() + 1);
			const events = this.calendarViewData.calendarViewDetails.filter(calendarViewDetail => calendarViewDetail.row == rowIndex);
			let columnIndex = 0;
			if (events.length != 0){
				events.sort(function(a, b){return a.fromCol - b.fromCol})
				events.forEach(event => {
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
}
