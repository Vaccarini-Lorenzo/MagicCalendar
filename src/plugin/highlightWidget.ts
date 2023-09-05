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
		const icalNavUL = document.createElement("ul");
		icalNavUL.addClass("icalNavUL");

		const mark = icalNavUL.createEl("span");
		mark.addClass(this.markClass);
		mark.innerText = this.sentenceValue;

		const bubble = mark.createEl("div");
		bubble.addClass("icalBubblePosition");
		bubble.addClass("icalHoverBubble");

		const grid = bubble.createEl("div")
		grid.addClass("icalGridContainer");

		const titleIcon = grid.createEl("span");
		titleIcon.addClass("icalIconBar");
		titleIcon.innerText = " 📕 ";

		const titleContent = grid.createEl("span");
		titleContent.addClass("icalEventDataBar");
		titleContent.innerText = ` ${this.eventDetails.title} `;

		const dateIcon = grid.createEl("span");
		dateIcon.addClass("icalIconBar");
		dateIcon.innerText = " 📅 ";

		const dateContent = grid.createEl("span");
		dateContent.addClass("icalEventDataBar");
		dateContent.innerText = ` ${this.eventDetails.dateString} `;

		if (this.eventDetails.hasTimeDetails){
			const timeIcon = grid.createEl("span");
			timeIcon.addClass("icalIconBar");
			timeIcon.innerText = " 🕑 ";

			const timeContent = grid.createEl("span");
			timeContent.addClass("icalEventDataBar");
			timeContent.innerText = ` ${this.eventDetails.timeString} `;
		}

		const row = bubble.createEl("div");
		row.addClass("icalGridRow");

		const buttonSync = row.createEl("button")
		buttonSync.innerText = "Sync";
		buttonSync.addClass("icalSyncButton");
		buttonSync.onClickEvent(() => {
			this.syncCallback(true);
		})

		const buttonNoSync = row.createEl("button")
		buttonNoSync.addClass("icalSyncButton");
		buttonNoSync.innerText = "Ignore";
		buttonNoSync.onClickEvent(() => {
			this.syncCallback(false);
		})

		return icalNavUL;
	}
}
