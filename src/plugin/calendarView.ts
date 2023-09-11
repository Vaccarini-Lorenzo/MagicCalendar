import {MarkdownRenderChild} from "obsidian";
import {CalendarViewHTML} from "./calendarViewHTML";
import {CalendarViewData} from "../model/calendarViewData";

export class CalendarView extends MarkdownRenderChild {
	calendarViewData: CalendarViewData;
	calendarViewHTML: CalendarViewHTML;

	constructor(containerEl: HTMLElement, calendarViewData: CalendarViewData) {
		super(containerEl);
		this.calendarViewData = calendarViewData;
		this.calendarViewHTML = new CalendarViewHTML(this.containerEl, this.calendarViewData);
	}

	onload() {
		this.containerEl.replaceWith(this.calendarViewHTML.html);
	}
}
