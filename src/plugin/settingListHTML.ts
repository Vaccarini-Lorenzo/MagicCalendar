import {Setting} from "obsidian";
import {Misc} from "../misc/misc";
import {Media} from "../misc/media";

export class settingListHTML extends Setting {
	containerEl: HTMLElement;
	elements: string[];
	listContainer: HTMLElement;
	maxLength?: number;
	deleteCallback: (pattern: string) => void;

	constructor(containerEl: HTMLElement, deleteCallback :(pattern: string) => void, elements: string[], maxLength?: number) {
		super(containerEl);
		this.containerEl = containerEl;
		this.elements = elements;
		this.deleteCallback = deleteCallback;
		this.listContainer = this.containerEl.createEl("div", { cls: "magicCalendarSettingListContainer" });
		this.maxLength = maxLength;
	}

	build(){
		this.listContainer.empty();
		if (!this.elements) return;
		this.elements.forEach(element => {
			this.createListElement(element)
		});
	}

	createListElement(element: string){
		const listItem = this.listContainer.createEl("div", { cls: "magicCalendarSettingListItem" });
		const itemText = listItem.createEl("span", { cls: "magicCalendarSettingListText" });
		itemText.setText(element);
		const trashIcon = listItem.createEl("img", { cls: "magicCalendarSettingListDeleteIcon" });
		trashIcon.setAttribute("src", Media.getBase64DeleteIcon());
		trashIcon.onClickEvent(click => {
						this.elements.remove(element);
			this.build();
			this.deleteCallback(element);
		})
	}

	append(bannedPattern: string) {
		if (this.maxLength && this.elements.length >= this.maxLength) this.elements.pop();
		this.elements.unshift(bannedPattern);
		this.build();
	}
}
