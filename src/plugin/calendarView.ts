import {MarkdownRenderChild} from "obsidian";

export class CalendarView extends MarkdownRenderChild {
	hourSpan: number;

	constructor(containerEl: HTMLElement, text: string) {
		super(containerEl);
		this.hourSpan = 24;
	}

	onload() {
		const test = this.containerEl.createSpan({
			//text: this.text,
		});
		this.containerEl.replaceWith(test);
	}
}
