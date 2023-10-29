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
		const magicCalendarNavUL = document.createElement("ul");
		magicCalendarNavUL.addClass("magicCalendarNavUL");

		const mark = magicCalendarNavUL.createEl("span");
		mark.addClass(this.markClass);
		mark.innerText = this.sentenceValue;

		const bubble = mark.createEl("div");
		bubble.addClass("magicCalendarBubblePosition");
		bubble.addClass("magicCalendarHoverBubble");

		const grid = bubble.createEl("div")
		grid.addClass("magicCalendarGridContainer");

		const titleIcon = grid.createEl("span");
		titleIcon.addClass("magicCalendarIconBar");
		titleIcon.innerText = " 📕 ";

		const titleContent = grid.createEl("span");
		titleContent.addClass("magicCalendarEventDataBar");
		titleContent.innerText = ` ${this.eventDetails.title} `;

		const dateIcon = grid.createEl("span");
		dateIcon.addClass("magicCalendarIconBar");
		dateIcon.innerText = " 📅 ";

		const dateContent = grid.createEl("span");
		dateContent.addClass("magicCalendarEventDataBar");
		dateContent.innerText = ` ${this.eventDetails.dateString} `;

		if (this.eventDetails.hasTimeDetails){
			const timeIcon = grid.createEl("span");
			timeIcon.addClass("magicCalendarIconBar");
			timeIcon.innerText = " 🕑 ";

			const timeContent = grid.createEl("span");
			timeContent.addClass("magicCalendarEventDataBar");
			timeContent.innerText = ` ${this.eventDetails.timeString} `;
		}

		const row = bubble.createEl("div");
		row.addClass("magicCalendarGridRow");

		const buttonSync = row.createEl("button")
		buttonSync.innerText = "Sync";
		buttonSync.addClass("magicCalendarSyncButton");
		buttonSync.onClickEvent(() => {
			this.syncCallback(true);
		})

		const buttonNoSync = row.createEl("button")
		buttonNoSync.addClass("magicCalendarSyncButton");
		buttonNoSync.innerText = "Ignore";
		buttonNoSync.onClickEvent(() => {
			this.syncCallback(false);
		})

		return magicCalendarNavUL;
	}
}
