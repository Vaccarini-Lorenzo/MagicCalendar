import {Plugin} from 'obsidian';
import {iCloudServiceStatus} from "../iCloudJs";
import {iCloudStatusModal} from "./modal";
import nplController from "../controllers/nlpController";
import nlpController from "../controllers/nlpController";
import nlpPlugin from "./nlpExtension";
import {PluginValue} from "@codemirror/view";
import {AppSetting, DEFAULT_SETTINGS, SettingInterface} from "./appSetting";
import iCloudMisc from "../iCloudJs/iCloudMisc";
import iCloudController from "../controllers/iCloudController";
import safeController from "../controllers/safeController";
import {randomBytes} from "crypto";
import eventController from "../controllers/eventController";
import {Misc} from "../misc/misc";

let statusModal: iCloudStatusModal;

export default class iCalObsidianSync extends Plugin implements PluginValue{
	iCloudStatus: iCloudServiceStatus;
	appSetting: AppSetting;
	settings: SettingInterface;

	async onload() {
		await this.initSettings();

		this.injectDependencies();

		this.initState();

		this.registerEvents();

		this.registerEditorExtension(nlpPlugin)

		await this.checkLogin();

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

	private updateStatus(status: iCloudServiceStatus){
		this.iCloudStatus = status;
		statusModal.updateModal(status);
		if (this.iCloudStatus == iCloudServiceStatus.Trusted || this.iCloudStatus == iCloudServiceStatus.Ready){
			iCloudController.preloadData().then(() => {
				this.appSetting.updateCalendarDropdown(iCloudController.getCalendarNames());
			});
		}
	}
	
	private async submitCallback(username: string, pw: string, ref: any): Promise<boolean> {
		const status = await iCloudController.tryAuthentication(username, pw);
		ref.updateStatus(status);
		return status != iCloudServiceStatus.Error
	}

	private async mfaCallback(code: string, ref: any){
		const status = await iCloudController.MFACallback(code);
		ref.updateStatus(status);
		statusModal.open();
	}

	private registerEvents(){
		this.addCommand({
			id: "iCal",
			name: "Insert iCloud credentials",
			callback: () => {
				statusModal.open();
			},
		});
	}

	private injectDependencies() {
		const basePath = (this.app.vault.adapter as any).basePath
		const pluginPath =`${basePath}/.obsidian/plugins/ical-obsidian-sync`;
		nlpController.injectPath(pluginPath)
		safeController.injectPath(pluginPath);
		safeController.injectSettings(this.settings);
		iCloudController.injectPath(pluginPath);
		iCloudController.injectSettings(this.settings);
		iCloudMisc.setProxyEndpoint(this.settings.proxyEndpoint);
		eventController.injectPath(pluginPath);
	}

	private initState() {
		// TODO: Maybe ping the proxy server to avoid cold starts?
		nplController.init();
		eventController.init();
		statusModal = new iCloudStatusModal(this.app, this.submitCallback, this.mfaCallback, this);
		this.iCloudStatus = iCloudServiceStatus.NotStarted;
		Misc.app = this.app;
	}

	async checkLogin() {
		if(safeController.checkSafe()){
			const iCloudStatus = await iCloudController.tryAuthentication("", "");
			this.updateStatus(iCloudStatus);
		}
	}

	private async initSettings() {
		this.appSetting = new AppSetting(this.app, this);
		await this.loadSettings();
		this.addSettingTab(this.appSetting);
		await this.checkEncryption();
	}

	private async checkEncryption(){
		if (this.settings.key == "none" || this.settings.iv == "none"){
			
			const key = randomBytes(32);
			const iv = randomBytes(16);
			this.settings.key = key.toString("hex");
			this.settings.iv = iv.toString("hex");
			this.appSetting.updateEncryption(this.settings.key, this.settings.iv);
			await this.saveSettings();
			
		}
	}

	public updateSettings(){
		safeController.injectSettings(this.settings);
		iCloudController.injectSettings(this.settings);
		iCloudMisc.setProxyEndpoint(this.settings.proxyEndpoint);
	}
}


