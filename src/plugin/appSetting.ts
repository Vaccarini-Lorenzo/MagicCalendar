import {App, PluginSettingTab, Setting} from "obsidian";
import iCalObsidianSync from "./main";
import dayjs from "dayjs";

export interface SettingInterface {
	tz: string;
	calendar: string;
	key: string;
	iv: string;
}

export const DEFAULT_SETTINGS: Partial<SettingInterface> = {
	tz: dayjs.tz.guess(),
	calendar: "none",
	key: "none",
	iv: "none"
};

export class AppSetting extends PluginSettingTab {
	plugin: iCalObsidianSync;
	retryLogin: boolean;
	calendarNames: string[]
	key: string;
	iv: string;

	constructor(app: App, plugin: iCalObsidianSync) {
		super(app, plugin);
		this.plugin = plugin;
		this.calendarNames = [];
		this.retryLogin = false;
	}

	updateCalendarDropdown(calendarNames: string[]){
		this.calendarNames = calendarNames;
	}

	updateEncryption(key: string, iv: string){
		this.key = key;
		this.iv = iv;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const general = containerEl.createEl("h3", {text: "General"})

		new Setting(general)
			.setName("Time zone")
			.addText(tz => {
				tz.setValue((this.plugin.settings.tz));
				tz.onChange(async value => {
					this.plugin.settings.tz = value;
				})
			})

		if (this.calendarNames.length == 0)
			new Setting(containerEl)
				.setName("Calendar")
				.addDropdown(dropDown => {
					dropDown.setDisabled(true);
				})
		else new Setting(containerEl)
			.setName("Calendar")
			.addDropdown(dropdown => {
				this.calendarNames.forEach((calendarName, i) => dropdown.addOption(calendarName, calendarName))
				dropdown.onChange(async value => {
					this.plugin.settings.calendar = value;
				})
			})

		containerEl.createEl("h3", {text: "Advanced"});

		new Setting(containerEl)
			.setName("Encryption key")
			.addText(key => {
				key.setValue(this.plugin.settings.key ?? "none");
				key.onChange(async value => {
					this.plugin.settings.key = value;
				})
			})

		new Setting(containerEl)
			.setName("Encryption IV")
			.addText(iv => {
				iv.setValue(this.plugin.settings.iv ?? "none");
				iv.onChange(async value => {
					this.plugin.settings.iv = value;
				})
			})

		new Setting(containerEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit changes")
					.setCta()
					.onClick(async () => {
						await this.plugin.saveSettings();
						this.plugin.updateSettings();
						await this.plugin.checkLogin();
					}));

	}
}
