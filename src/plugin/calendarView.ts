import {MarkdownRenderChild} from "obsidian";

export class CalendarView extends MarkdownRenderChild {
	calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate};
	paletteNumber: number;
	paletteIndex: number;
	numOfEvents: number;
	paletteIndexIncrease: number;

	constructor(containerEl: HTMLElement, calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate}) {
		super(containerEl);
		this.calendarViewData = calendarViewData;
		this.paletteNumber = 22;
		this.paletteIndex = 0;
		this.numOfEvents = this.calendarViewData.calendarViewDetails.length;
		const paletteEventRatio = Math.round(this.paletteNumber / this.numOfEvents);
		this.paletteIndexIncrease = paletteEventRatio == 0 ? 1 : paletteEventRatio;
	}

	onload() {
		const wrapper = this.containerEl.createEl("div");
		wrapper.addClass("tableWrapper")
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
		
		for (let rowIndex = 0; rowIndex < this.calendarViewData.numOfRows; rowIndex++){
			const needsLabel = this.calendarViewData.rowNeedsLabelMap.get(rowIndex);
			
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
				eventView.addClass(this.getPaletteClass());
				eventView.addClass("eventBox")
				eventView.setAttr("colspan", event.toCol - event.fromCol)
				columnIndex = event.toCol;
			})
		}

		for (let i = columnIndex; i < this.calendarViewData.numOfCols; i++){
			row.createEl("td");
		}
	}

	private getPaletteClass(){
		const paletteClass = `palette-${this.paletteIndex}`;
		this.paletteIndex += this.paletteIndexIncrease;
		if (this.paletteIndex == this.paletteNumber) this.paletteIndex = 0;
		return paletteClass;
	}

}
