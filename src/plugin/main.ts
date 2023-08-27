import {Plugin} from 'obsidian';
import {StatusModal} from "./modal";
import {PluginValue} from "@codemirror/view";
import {Misc} from "../misc/misc";
import {join} from "path";
import {AppSetting, DEFAULT_SETTINGS, SettingInterface} from "./appSetting";
import {randomBytes} from "crypto";
import nplController from "../controllers/nlpController";
import nlpController from "../controllers/nlpController";
import safeController from "../controllers/safeController";
import eventController from "../controllers/eventController";
import calendarViewController from "../controllers/calendarViewController";
import {CloudEventFactory} from "../model/events/cloudEventFactory";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";
import {CloudController} from "../controllers/cloudController";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {GoogleCalendarController} from "../controllers/googleCalendarController";

let statusModal: StatusModal;

export default class iCalObsidianSync extends Plugin implements PluginValue{
	cloudController: CloudController;
	appSetting: AppSetting;
	settings: SettingInterface;

	async onload() {

		//TODO: Remove, just for testing purposes
		this.cloudController = new GoogleCalendarController();

		await this.initSettings();

		this.injectDependencies();

		this.initState();

		this.registerEvents();

		//this.registerEditorExtension(nlpPlugin)

		this.registerMarkdownPostProcessor(calendarViewController.getMarkdownPostProcessor);

		await this.checkLogin();

	}

	async onunload() {
		// Release any resources configured by the plugin.
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		console.log()
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private updateStatus(status: CloudStatus){
		statusModal.updateModal(status);
		if (status == CloudStatus.LOGGED){
			this.cloudController.preloadData().then(() => {
				this.appSetting.updateCalendarDropdown(this.cloudController.getCalendarNames());
			});
		}
	}

	private async selectProviderCallback(calendarProvider: CalendarProvider, ref: any){
		ref.settings.calendarProvider = calendarProvider;
		await ref.saveSettings();
		ref.updateStatus(CloudStatus.PROVIDER_SELECTED);
	}
	
	private async submitCredentialsCallback(submitObject: any, ref: any): Promise<boolean> {
		const status = await ref.cloudController.tryAuthentication(submitObject);
		ref.updateStatus(status);
		return status != CloudStatus.ERROR;
	}

	private async submitMfaCallback(code: string, ref: any){
		const status = await ref.cloudController.MFACallback(code);
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
		const pluginPath = join(basePath, this.manifest.dir)
		nlpController.injectPath(pluginPath)
		safeController.injectPath(pluginPath);
		safeController.injectSettings(this.settings);
		safeController.injectCalendarProvider(this.settings.calendarProvider);
		this.cloudController.injectPath(pluginPath);
		this.cloudController.injectSettings(this.settings);
		eventController.injectPath(pluginPath);
		eventController.injectCloudController(this.cloudController);
		eventController.injectCloudControllerFactory(new CloudEventFactory(this.settings.calendarProvider));
	}

	private initState() {
		nplController.init();
		eventController.init();
		statusModal = new StatusModal(this.app, this.selectProviderCallback, this.submitCredentialsCallback, this.submitMfaCallback, this);
		this.updateStatus(CloudStatus.NOT_STARTED);
		Misc.app = this.app;
	}

	async checkLogin() {
		if(safeController.checkSafe()){
			const auth = safeController.getCredentials();
			const cloudStatus = await this.cloudController.tryAuthentication(auth);
			this.updateStatus(cloudStatus);
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
		this.cloudController.injectSettings(this.settings);
	}
}
