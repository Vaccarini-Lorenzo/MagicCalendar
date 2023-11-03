import {Setting} from "obsidian";
import {Misc} from "../misc/misc";
import {Media} from "../misc/media";

export class BannedListHTML extends Setting {
	containerEl: HTMLElement;
	bannedPatterns: string[];
	listContainer: HTMLElement;
	deleteCallback: (pattern: string) => void;

	constructor(containerEl: HTMLElement, deleteCallback :(pattern: string) => void, bannedPatterns: string[]) {
		super(containerEl);
		this.containerEl = containerEl;
		this.bannedPatterns = bannedPatterns;
		this.deleteCallback = deleteCallback;
		this.listContainer = this.containerEl.createEl("div", { cls: "magicCalendarSettingListContainer" });
	}

	build(){
		this.listContainer.empty();

				this.bannedPatterns.forEach(bannedPattern => {
						this.createListElement(bannedPattern)
		});
	}

	createListElement(bannedPattern: string){
		const listItem = this.listContainer.createEl("div", { cls: "magicCalendarSettingListItem" });
		const itemText = listItem.createEl("span", { cls: "magicCalendarSettingListText" });
		itemText.setText(bannedPattern);
		const trashIcon = listItem.createEl("img", { cls: "magicCalendarSettingListDeleteIcon" });
		trashIcon.setAttribute("src", Media.getBase64DeleteIcon());
		trashIcon.onClickEvent(click => {
						this.bannedPatterns.remove(bannedPattern);
			this.build();
			this.deleteCallback(bannedPattern);
		})
	}

	append(bannedPattern: string) {
		this.bannedPatterns.push(bannedPattern);
		this.build();
	}
}
