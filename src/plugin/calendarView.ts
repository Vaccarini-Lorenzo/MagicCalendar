import {MarkdownRenderChild} from "obsidian";

export class CalendarView extends MarkdownRenderChild {
	text: string;

	constructor(containerEl: HTMLElement, text: string) {
		super(containerEl);
		this.text = text;
	}

	onload() {
		const test = this.containerEl.createSpan({
			text: this.text,
		});
		this.containerEl.replaceWith(test);
	}
}
