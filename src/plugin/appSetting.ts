import {App, PluginSettingTab, Setting, TextAreaComponent, TextComponent} from "obsidian";
import MagicCalendar from "./main";
import moment, {tz} from "moment-timezone";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";
import {settingListHTML} from "./settingListHTML";

export interface SettingInterface {
	tz: string;
	calendar: string;
	key: string;
	iv: string;
	calendarProvider: CalendarProvider;
	bannedPatterns: string[];
	customSymbol: string;
}

export const DEFAULT_SETTINGS: Partial<SettingInterface> = {
	tz: moment.tz.guess(),
	calendar: "none",
	key: "none",
	iv: "none",
	calendarProvider: CalendarProvider.NOT_SELECTED,
	bannedPatterns: [],
	customSymbol: ""
};

export class AppSetting extends PluginSettingTab {
	plugin: MagicCalendar;
	retryLogin: boolean;
	calendarNames: string[]
	key: string;
	iv: string;
	bannedPatternText: TextComponent;
	bannedListHTML: settingListHTML;
	customPatternText: TextComponent;
	customSymbolHTML: settingListHTML;


	constructor(app: App, plugin: MagicCalendar) {
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

		new Setting(containerEl)
			.setName("Custom symbol")
			.addText(async text => {
				text.setPlaceholder("N/A")
				text.setValue(this.plugin.settings.customSymbol)
				text.onChange(async value => {
					this.plugin.settings.customSymbol = value;
					await this.plugin.updateSettings();
				})
			})

		new Setting(containerEl)
			.setName("Ban pattern")
			.addText(text => {
				this.bannedPatternText = text;
				text.setPlaceholder("Banned pattern")
			})
			.addButton(button => {
				button.setIcon("plus");
				button.onClick(click => {
					const bannedPattern = this.bannedPatternText.getValue();
					this.bannedListHTML.append(bannedPattern);
					this.bannedPatternText.setValue("");
				})
			})

		this.bannedListHTML = new settingListHTML(containerEl, this.updateBannedPatterns.bind(this), this.plugin.settings.bannedPatterns)
		this.bannedListHTML
			.build()
	}

	async updateBannedPatterns(deletedPattern: string){
		this.plugin.settings.bannedPatterns.remove(deletedPattern);
		await this.plugin.updateSettings();
	}
}
