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

const safeController = new SafeController();
const pluginController = new PluginController();
let statusModal: iCloudStatusModal;

export default class iCalObsidianSync extends Plugin {
	iCloudStatus: iCloudServiceStatus;
	settings: Settings;
	iCloud: iCloudService;
	
	async onload() {
		this.iCloudStatus = iCloudServiceStatus.NotStarted;
		const basePath = (this.app.vault.adapter as any).basePath
		const pluginPath =`${basePath}/.obsidian/plugins/obsidian-ical-sync`;

		safeController.injectPath(pluginPath);
		pluginController.injectPath(pluginPath);
		pluginController.injectSafeController(safeController);

		statusModal = new iCloudStatusModal(this.app, this.submitCallback, this.mfaCallback, this.syncCallback, this);

		if(safeController.checkSafe()){
			console.log("checking safe");
			const iCloudStatus = await pluginController.tryAuthentication("", "");
			this.updateStatus(iCloudStatus);
		}

		this.registerEvents();

		console.log("fetching tags...")
		pluginController.fetchTags(this.app);
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
		statusModal.updateModal(status);
	}
	
	async submitCallback(username: string, pw: string, ref: any){
		const status = await pluginController.tryAuthentication(username, pw);
		ref.updateStatus(status);
	}

	async mfaCallback(code: string, ref: any){
		const status = await pluginController.MFACallback(code);
		ref.updateStatus(status);
	}

	async syncCallback(ref: any){
		//await pluginController.syncCallback("test");
	}


	registerEvents(){
		this.registerEvent(this.app.metadataCache.on('changed', (file, data, cache) => {
			cache.tags.forEach(t => console.log(t));
		}));

		this.registerEvent(this.app.metadataCache.on('deleted', (file, data) => {
			console.log("DELETED!");
			console.log(`file = ${file}\n\ndata=${data}\n\n`)
		}))

		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				statusModal.open();
			},
		});
	}


}

