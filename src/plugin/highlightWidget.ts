import {EditorView, WidgetType} from "@codemirror/view";

export class HighlightWidget extends WidgetType {
	sentenceValue: string;
	eventDetails: string;
	syncCallback: () => void;
	markClass: string;

	constructor(sentenceValue: string, eventDetails: string, syncCallback: () => void, firstLoad: boolean) {
		super();
		this.sentenceValue = sentenceValue;
		this.eventDetails = eventDetails;
		this.syncCallback = syncCallback;
		this.markClass = "highlighted-text-static";
		if(firstLoad) this.markClass = "highlighted-text-dynamic";
	}

	toDOM(view: EditorView): HTMLElement {
		const navUl = document.createElement("ul");
		navUl.addClass("navUL");
		const mark = navUl.createEl("span");
		mark.addClass(this.markClass);
		mark.innerText = this.sentenceValue;
		const bubble = mark.createEl("div");
		bubble.addClass("bubblePosition");
		bubble.addClass("hoverBubble");
		const grid = bubble.createEl("div")
		grid.addClass("gridContainer");
		grid.innerHTML = this.eventDetails;
		const row = bubble.createEl("div");
		row.addClass("row");
		const buttonSync = row.createEl("button")
		buttonSync.innerText = "Sync";
		buttonSync.addClass("syncButton");
		buttonSync.onClickEvent((mouseEvent) => {
			this.syncCallback.call(this);
		})
		const buttonNoSync = row.createEl("button")
		buttonNoSync.addClass("syncButton");
		buttonNoSync.innerText = "Ignore";

		return navUl;

	}
}
