import {Plugin} from 'obsidian';
import iCloudService, {iCloudServiceStatus} from "../iCloudJs";
import PluginController from "../controllers/pluginController";
import SafeController from "../controllers/safeController";
import {iCloudStatusModal} from "./modal";

interface Settings {
	mySetting: string;
}

const DEFAULT_SETTINGS: Settings = {
	mySetting: 'default'
}

export default class iCalObsidianSync extends Plugin {
	settings: Settings;
	_iCloud: iCloudService;
	_pluginController: PluginController;
	_safeController: SafeController;

	iCloudStatusModal: iCloudStatusModal;
	iCloudStatus: iCloudServiceStatus;

	async onload() {
		const basePath = (this.app.vault.adapter as any).basePath
		this._safeController = new SafeController();
		this._safeController.injectPath(basePath);
		this.registerEvents();

		this._pluginController = new PluginController(this._safeController);
		console.log("fetching tags...")
		this._pluginController.fetchTags(this.app);

		this.iCloudStatus = iCloudServiceStatus.NotStarted;
		if(this._safeController.checkSafe()){
			const iCloudStatus = await this._pluginController.tryAuthentication("", "");
			this.updateStatus(iCloudStatus);
		}

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


	updateStatus(status: iCloudServiceStatus){
		this.iCloudStatus = status;
		this.iCloudStatusModal.updateModal(status);
	}

	async submitCallback(username: string, pw: string){
		const status = await this._pluginController.tryAuthentication(username, pw);
		this.updateStatus(status);
	}

	async mfaCallback(code: string){
		const status = await this._pluginController.MFACallback(code);
		this.updateStatus(status);
	}



	registerEvents(){

		this.iCloudStatusModal = new iCloudStatusModal(this.app, this.submitCallback, this.mfaCallback);

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
				this.iCloudStatusModal.open();
			},
		});
	}


}


