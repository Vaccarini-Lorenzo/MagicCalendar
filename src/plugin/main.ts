import {Plugin} from 'obsidian';
import {ExampleModal} from "./modal";
import iCloudService from "../iCloudJs";
import PluginController from "../controllers/pluginController";
import safeController from "../controllers/safeController";
import SafeController from "../controllers/safeController";

interface Settings {
	mySetting: string;
}

const DEFAULT_SETTINGS: Settings = {
	mySetting: 'default'
}

// TODO:
// Move these test classes in another module


// TODO:
// Big ass refactor, need to move logic


export default class iCalObsidianSync extends Plugin {
	settings: Settings;
	_iCloud: iCloudService;
	_pluginController: PluginController;
	_safeController: SafeController;

	async onload() {
		const basePath = (this.app.vault.adapter as any).basePath
		this._safeController = new SafeController();
		this._safeController.injectPath(basePath);

		this._pluginController = new PluginController(this._safeController);
		console.log("fetching tags...")
		this._pluginController.fetchTags(this.app);

		if(this._safeController.checkSafe()){
			this._iCloud = new iCloudService({username:"", password:"", saveCredentials:true, trustDevice:true}, this._safeController);
			await this._iCloud.authenticate();
		}

		this.registerEvent(this.app.metadataCache.on('changed', (file, data, cache) => {
			cache.tags.forEach(t => console.log(t));
			console.log(JSON.stringify(cache.blocks));
		}));
		this.registerEvent(this.app.metadataCache.on('deleted', (file, data) => {
			console.log("DELETED!");
			console.log(`file = ${file}\n\ndata=${data}\n\n`)
		}))

		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				new ExampleModal(this.app, this._pluginController.loginCallback, this._pluginController.testCallback).open();
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


