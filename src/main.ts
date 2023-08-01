import {Plugin} from 'obsidian';
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
	_iCloud: iCloudService;
	async iCloudLogin(username: string, password: string): Promise<iCloudServiceStatus> {
		this._iCloud = new iCloudService({
			username,
			password,
			saveCredentials: true,
			trustDevice: true
		});

		await this._iCloud.authenticate();
		return this._iCloud.status;
	}

	async iCloudMfa(mfa: string): Promise<iCloudServiceStatus> {
		await this._iCloud.provideMfaCode(mfa);
		await this._iCloud.awaitReady;
		console.log(this._iCloud.status);
		if (this._iCloud.status == iCloudServiceStatus.Ready){
			const calendarService = this._iCloud.getService("calendar");
			const events = await calendarService.events();
			events.forEach((event) => console.log(JSON.stringify(event)));
		}
		return this._iCloud.status;
	}

	async onload() {
		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				new ExampleModal(this.app, this.iCloudLogin, this.iCloudMfa).open();
			},
		});
	}
	async onunload() {
		// Release any resources configured by the plugin.
		//proxy.stop();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
