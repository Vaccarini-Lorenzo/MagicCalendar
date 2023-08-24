import {EditorView, WidgetType} from "@codemirror/view";

export class UnderlineWidget extends WidgetType {
	innerText: string;
	underline: HTMLElement;
	underlineClass: string;

	constructor(innerText: string, firstLoad: boolean) {
		super();
		this.innerText = innerText;
		this.underline = document.createElement("span");
		this.underlineClass = "underlinedTextStatic"
		if(firstLoad) this.underlineClass = "underlinedTextDynamic"
	}

	toDOM(view: EditorView): HTMLElement {
		this.underline.addClass(this.underlineClass);
		this.underline.innerText = this.innerText;
		return this.underline;
	}
}
