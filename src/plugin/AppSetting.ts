import {App, PluginSettingTab, Setting} from "obsidian";
import iCalObsidianSync from "./main";

export interface SettingInterface {
	tz: string;
	proxyEndpoint: string;
	calendar: string;
}

export const DEFAULT_SETTINGS: Partial<SettingInterface> = {
	tz: "Europe/Rome",
	proxyEndpoint: "https://icalobsidiansyncproxy.onrender.com/proxy",
	calendar: "none"
};

export class AppSetting extends PluginSettingTab {
	plugin: iCalObsidianSync;
	calendarNames: string[]

	constructor(app: App, plugin: iCalObsidianSync) {
		super(app, plugin);
		this.plugin = plugin;
		this.calendarNames = []
	}

	updateCalendarDropdown(calendarNames: string[]){
		console.log("Updating dropdown");
		this.calendarNames = calendarNames;
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
					await this.plugin.saveSettings();
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
				this.calendarNames.forEach((calendarName, i) => dropdown.addOption(`${i}`, calendarName))
				dropdown.onChange(async value => {
					this.plugin.settings.calendar = value;
					await this.plugin.saveSettings();
				})
			})

		containerEl.createEl("h3", {text: "Advanced"});

		new Setting(containerEl)
			.setName("CORS proxy endpoint")
			.addText(proxyServerURL => {
				proxyServerURL.setValue((this.plugin.settings.proxyEndpoint));
				proxyServerURL.onChange(async value => {
					this.plugin.settings.proxyEndpoint = value;
					await this.plugin.saveSettings();
				})
			})
	}
}
