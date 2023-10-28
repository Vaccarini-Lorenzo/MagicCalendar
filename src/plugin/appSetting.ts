import {App, PluginSettingTab, Setting} from "obsidian";
import iCalObsidianSync from "./main";
import moment from "moment-timezone";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";

export interface SettingInterface {
	tz: string;
	calendar: string;
	key: string;
	iv: string;
	calendarProvider: CalendarProvider;
}

export const DEFAULT_SETTINGS: Partial<SettingInterface> = {
	tz: moment.tz.guess(),
	calendar: "none",
	key: "none",
	iv: "none",
	calendarProvider: CalendarProvider.NOT_SELECTED
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
		new Setting(containerEl)
			.setName("Time zone")
			.addText(tz => {
				tz.setValue((this.plugin.settings.tz));
				tz.onChange(async value => {
					this.plugin.settings.tz = value;
					await this.plugin.updateSettings();
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
				this.calendarNames.forEach((calendarName) => dropdown.addOption(calendarName, calendarName));
				dropdown.setValue(this.plugin.settings.calendar);
				dropdown.onChange(async value => {
					this.plugin.settings.calendar = value;
					await this.plugin.updateSettings();
				})
			})

		containerEl.createEl("h3", {text: "Advanced"});

		new Setting(containerEl)
			.setName("Encryption key")
			.addText(key => {
				key.setValue(this.plugin.settings.key ?? "none");
				key.onChange(async value => {
					this.plugin.settings.key = value;
					await this.plugin.updateSettings();
				})
			})

		new Setting(containerEl)
			.setName("Encryption IV")
			.addText(iv => {
				iv.setValue(this.plugin.settings.iv ?? "none");
				iv.onChange(async value => {
					this.plugin.settings.iv = value;
					await this.plugin.updateSettings();
				})
			})
	}
}
