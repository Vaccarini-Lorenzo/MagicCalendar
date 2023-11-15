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
import nlpPlugin from "./nlpExtension";
import {iCalendarController} from "../controllers/iCalendarController";

export default class MagicCalendar extends Plugin implements PluginValue{
	private _cloudController: CloudController;
	private _cloudEventFactory: CloudEventFactory;
	private _appSetting: AppSetting;
	settings: SettingInterface;
	private _pluginPath: string;
	private _statusModal: StatusModal;

	async onload() {

		await this.initSettings();

		this.injectDependencies();

		this.initState();

		this.manageRegistrations();

		await this.checkLogin();

	}

	private async initSettings() {
		this._appSetting = new AppSetting(this.app, this);
		await this.loadSettings();
		this.addSettingTab(this._appSetting);
		await this.checkEncryption();
	}

	private injectDependencies() {
		const basePath = (this.app.vault.adapter as any).basePath
		this._pluginPath = join(basePath, this.manifest.dir)
		this._cloudEventFactory = new CloudEventFactory(this.settings);
		nlpController.injectPath(this._pluginPath);
		nlpController.injectSettings(this.settings);
		safeController.injectPath(this._pluginPath);
		safeController.injectSettings(this.settings);
		safeController.injectCalendarProvider(this.settings.calendarProvider);
		eventController.injectPath(this._pluginPath);
		eventController.injectCloudControllerFactory(this._cloudEventFactory);
	}

	private initState() {
		Misc.app = this.app;
		Misc.fetchCred();
		nplController.init();
		eventController.init();
		this._statusModal = new StatusModal(this.app, this.selectProviderCallback, this.submitCredentialsCallback, this.submitMfaCallback, this);
		this.updateStatus(CloudStatus.NOT_STARTED);
	}

	private manageRegistrations(){
		this.registerEditorExtension(nlpPlugin)
		this.registerMarkdownPostProcessor(calendarViewController.getMarkdownPostProcessor);
		this.addRibbonIcon("calendar-clock", "MagicCalendar", () => {
			this._statusModal.open();
		});
	}

	async checkLogin() {
		if(safeController.checkSafe()){
			const auth = safeController.getCredentials();
			this.inferCalendar(auth);
			const cloudStatus = await this._cloudController.tryAuthentication(auth);
			this.updateStatus(cloudStatus);
		}
	}

	private inferCalendar(auth: Map<string, string>) {
		if (this._cloudController != undefined) return;
		if (auth.get("tokenType") != undefined) this._cloudController = new GoogleCalendarController();
		else if (auth.get("magicCalendarSyncUsername") != undefined) this._cloudController = new iCalendarController();
	}

	async onunload() {
		Misc.bindListeners.forEach(bindListener => {
			bindListener.doc.removeEventListener(bindListener.type, bindListener.eventCallback);
		})
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private updateStatus(status: CloudStatus){
		this._statusModal.updateModal(status);
		if (status == CloudStatus.PROVIDER_SELECTED || status == CloudStatus.LOGGED){
			eventController.injectCloudController(this._cloudController);
			this._statusModal.selectedProvider = this.settings.calendarProvider;
			this.updateSettings();
		}
		if (status == CloudStatus.LOGGED){
			this._cloudController.preloadData().then(() => {
				this._appSetting.updateCalendarDropdown(this._cloudController.getCalendarNames());
			});
			this._cloudController.managePushNotifications();
		}
	}

	private async selectProviderCallback(calendarProvider: CalendarProvider, ref: any){
		ref.settings.calendarProvider = calendarProvider;
		if (calendarProvider == CalendarProvider.NOT_SELECTED){
			ref._cloudController = undefined;
			ref.deleteCredentials();
			await ref.saveSettings();
			ref.updateStatus(CloudStatus.NOT_STARTED);
			return;
		}
		ref._cloudController = ref.getCloudController(calendarProvider);
		ref._cloudController.injectPath(ref._pluginPath);
		ref._cloudController.injectSettings(ref.settings);

		await ref.saveSettings();
		ref.updateStatus(CloudStatus.PROVIDER_SELECTED);
	}
	
	private async submitCredentialsCallback(submitObject: any, ref: any): Promise<boolean> {
		const status = await ref._cloudController.tryAuthentication(submitObject);
		ref.updateStatus(status);
		return status != CloudStatus.ERROR;
	}

	private async submitMfaCallback(code: string, ref: any): Promise<boolean> {
		const status = await ref._cloudController.MFACallback(code);
		ref.updateStatus(status);
		return status != CloudStatus.ERROR;
	}

	private async checkEncryption(){
		if (this.settings.key == "none" || this.settings.iv == "none"){
			const key = randomBytes(32);
			const iv = randomBytes(16);
			this.settings.key = key.toString("hex");
			this.settings.iv = iv.toString("hex");
			this._appSetting.updateEncryption(this.settings.key, this.settings.iv);
			await this.saveSettings();
		}
	}

	public async updateSettings(){
		safeController.injectSettings(this.settings);
		nlpController.injectSettings(this.settings);
		this._cloudController.injectSettings(this.settings);
		this._cloudEventFactory.injectSettings(this.settings);
		await this.saveSettings();
	}

	private getCloudController(calendarProvider: CalendarProvider) {
		if (calendarProvider == CalendarProvider.APPLE) return new iCalendarController();
		else if (calendarProvider == CalendarProvider.GOOGLE) return new GoogleCalendarController();
	}

	private deleteCredentials(){
		Misc.credentialKeyList.forEach(key => {
			if(localStorage.getItem(key) != undefined) localStorage.removeItem(key);
		})
	}
}
