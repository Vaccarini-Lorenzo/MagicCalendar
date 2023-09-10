import {MarkdownRenderChild} from "obsidian";
import {CalendarViewHTML} from "./calendarViewHTML";

export class CalendarView extends MarkdownRenderChild {
	calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate};
	calendarViewHTML: CalendarViewHTML;

	constructor(containerEl: HTMLElement, calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate}) {
		super(containerEl);
		this.calendarViewData = calendarViewData;
		this.calendarViewHTML = new CalendarViewHTML(this.containerEl, this.calendarViewData);
	}

	onload() {
		this.containerEl.replaceWith(this.calendarViewHTML.html);
	}
}
