import {MarkdownRenderChild} from "obsidian";
import {CalendarViewHTML} from "./calendarViewHTML";
import {CalendarViewData} from "../model/calendarViewData";

export class CalendarView extends MarkdownRenderChild {
	calendarViewData: CalendarViewData;
	calendarViewHTML: CalendarViewHTML;

	constructor(containerEl: HTMLElement, calendarViewData: CalendarViewData, dropCallback: (cloudEventUUID: string, updateMap: Map<string, string>) => void) {
		super(containerEl);
		this.calendarViewData = calendarViewData;
		this.calendarViewHTML = new CalendarViewHTML(this.containerEl, this.calendarViewData, dropCallback);
	}

	onload() {
		this.containerEl.replaceWith(this.calendarViewHTML.html);
	}
}
