import {EditorView, WidgetType} from "@codemirror/view";

export class HighlightWidget extends WidgetType {
	sentenceValue: string;
	eventDetails: {title, dateString, timeString, hasTimeDetails};
	syncCallback: (sync: boolean) => void;
	markClass: string;

	constructor(sentenceValue: string, eventDetails:  {title, dateString, timeString, hasTimeDetails}, syncCallback: (sync: boolean) => void) {
		super();
		this.sentenceValue = sentenceValue;
		this.eventDetails = eventDetails;
		this.syncCallback = syncCallback;
		this.markClass = "highlightedTextStatic";
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

		const titleIcon = grid.createEl("span");
		titleIcon.addClass("iconBar");
		titleIcon.innerText = " 📕 ";

		const titleContent = grid.createEl("span");
		titleContent.addClass("eventDataBar");
		titleContent.innerText = ` ${this.eventDetails.title} `;

		const dateIcon = grid.createEl("span");
		dateIcon.addClass("iconBar");
		dateIcon.innerText = " 📅 ";

		const dateContent = grid.createEl("span");
		dateContent.addClass("eventDataBar");
		dateContent.innerText = ` ${this.eventDetails.dateString} `;

		if (this.eventDetails.hasTimeDetails){
			const timeIcon = grid.createEl("span");
			timeIcon.addClass("iconBar");
			timeIcon.innerText = " 🕑 ";

			const timeContent = grid.createEl("span");
			timeContent.addClass("eventDataBar");
			timeContent.innerText = ` ${this.eventDetails.timeString} `;
		}

		const row = bubble.createEl("div");
		row.addClass("gridRow");

		const buttonSync = row.createEl("button")
		buttonSync.innerText = "Sync";
		buttonSync.addClass("syncButton");
		buttonSync.onClickEvent(() => {
			this.syncCallback(true);
		})

		const buttonNoSync = row.createEl("button")
		buttonNoSync.addClass("syncButton");
		buttonNoSync.innerText = "Ignore";
		buttonNoSync.onClickEvent(() => {
			this.syncCallback(false);
		})

		return navUl;
	}
}
