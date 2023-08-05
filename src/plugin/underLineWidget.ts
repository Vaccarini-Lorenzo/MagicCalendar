import {EditorView, WidgetType} from "@codemirror/view";

export class UnderlineWidget extends WidgetType {
	innerText: string;


	constructor(innerText: string) {
		super();
		this.innerText = innerText;

	}

	toDOM(view: EditorView): HTMLElement {
		const underline = document.createElement("span");
		underline.addClass("underlined-text");
		underline.innerText = this.innerText;
		return underline;

	}
}
