import {Plugin} from 'obsidian';
import {iCloudServiceStatus} from "../iCloudJs";
import ICloudController from "../controllers/iCloudController";
import SafeController from "../controllers/safeController";
import {iCloudStatusModal} from "./modal";
import nplController from "../controllers/nlpController";
import {nlpPlugin} from "./nlpExtension";
import {PluginValue} from "@codemirror/view";

interface Settings {
	mySetting: string;
}

const DEFAULT_SETTINGS: Settings = {
	mySetting: 'default'
}

// TODO: Put these fields back in the class and pass a reference in case the method is called from outside the class
const safeController = new SafeController();
export const iCloudController = new ICloudController();
let statusModal: iCloudStatusModal;

export default class iCalObsidianSync extends Plugin implements PluginValue{
	iCloudStatus: iCloudServiceStatus;
	settings: Settings;

	async onload() {
		this.iCloudStatus = iCloudServiceStatus.NotStarted;
		const basePath = (this.app.vault.adapter as any).basePath
		const pluginPath =`${basePath}/.obsidian/plugins/obsidian-ical-sync`;

		console.log("Path = ", pluginPath);

		nplController.init(pluginPath);
		this.registerEditorExtension(nlpPlugin)

		safeController.injectPath(pluginPath);
		iCloudController.injectPath(pluginPath);
		iCloudController.injectSafeController(safeController);
		iCloudController.injectApp(this.app);

		statusModal = new iCloudStatusModal(this.app, this.submitCallback, this.mfaCallback, this.syncCallback, this);

		if(safeController.checkSafe()){
			console.log("checking safe");
			const iCloudStatus = await iCloudController.tryAuthentication("", "");
			this.updateStatus(iCloudStatus);
		}

		this.registerEvents();

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
		const status = await iCloudController.tryAuthentication(username, pw);
		ref.updateStatus(status);
	}

	async mfaCallback(code: string, ref: any){
		const status = await iCloudController.MFACallback(code);
		ref.updateStatus(status);
	}

	async syncCallback(ref: any){
		//await pluginController.syncCallback("test");
	}


	registerEvents(){
		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				statusModal.open();
			},
		});
	}


}


