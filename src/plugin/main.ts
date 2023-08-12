import {Plugin} from 'obsidian';
import {iCloudServiceStatus} from "../iCloudJs";
import {iCloudStatusModal} from "./modal";
import nplController from "../controllers/nlpController";
import nlpController from "../controllers/nlpController";
import {nlpPlugin} from "./nlpExtension";
import {PluginValue} from "@codemirror/view";
import {AppSetting, DEFAULT_SETTINGS, SettingInterface} from "./appSetting";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import iCloudController from "../controllers/iCloudController";
import safeController from "../controllers/safeController";

let statusModal: iCloudStatusModal;

export default class iCalObsidianSync extends Plugin implements PluginValue{
	iCloudStatus: iCloudServiceStatus;
	appSetting: AppSetting;
	settings: SettingInterface;

	async onload() {

		await this.initSettings();

		this.injectDependencies();

		this.initState();

		this.registerEditorExtension(nlpPlugin)

		await this.checkLogin();

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
		if (this.iCloudStatus == iCloudServiceStatus.Trusted){
			iCloudController.preloadData().then(() => {
				this.appSetting.updateCalendarDropdown(iCloudController.getCalendarNames());
			});
		}
	}
	
	async submitCallback(username: string, pw: string, ref: any){
		const status = await iCloudController.tryAuthentication(username, pw);
		ref.updateStatus(status);
	}

	async mfaCallback(code: string, ref: any){
		const status = await iCloudController.MFACallback(code);
		ref.updateStatus(status);
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


	private injectDependencies() {
		const basePath = (this.app.vault.adapter as any).basePath
		const pluginPath =`${basePath}/.obsidian/plugins/obsidian-ical-sync`;
		nlpController.injectPath(pluginPath)
		safeController.injectPath(pluginPath);
		iCloudController.injectPath(pluginPath);
		iCloudController.injectSettings(this.settings);
		iCloudMisc.setProxyEndpoint(this.settings.proxyEndpoint);
	}

	private initState() {

		// TODO: Maybe ping the proxy server to avoid cold starts?

		this.iCloudStatus = iCloudServiceStatus.NotStarted;
		nplController.init();
		statusModal = new iCloudStatusModal(this.app, this.submitCallback, this.mfaCallback, this);
	}

	async checkLogin() {
		if(safeController.checkSafe()){
			console.log("checking safe");
			const iCloudStatus = await iCloudController.tryAuthentication("", "");
			this.updateStatus(iCloudStatus);
		}
	}

	private async initSettings() {
		this.appSetting = new AppSetting(this.app, this);
		await this.loadSettings();
		this.addSettingTab(this.appSetting);
	}

	updateSettings(){
		console.log(this.settings);
		iCloudController.injectSettings(this.settings);
	}
}


