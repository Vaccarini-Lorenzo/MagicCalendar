import { Plugin } from 'obsidian';
import {ExampleModal} from "./modal";
import iCloudService, {iCloudServiceStatus} from "./iCloudJs";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class ExamplePlugin extends Plugin {
	settings: MyPluginSettings;
	async iCloudLogin(username: string, password: string): Promise<iCloudServiceStatus> {
		const iCloud = new iCloudService({
			username,
			password,
			saveCredentials: true,
			trustDevice: true
		});

		await iCloud.authenticate();
		return iCloud.status;
	}

	async onload() {
		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				new ExampleModal(this.app, this.iCloudLogin).open();
			},
		});
	}
	async onunload() {
		// Release any resources configured by the plugin.
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
