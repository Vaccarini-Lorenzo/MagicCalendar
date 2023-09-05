import {App, Modal, Setting} from "obsidian";
import {Misc} from "src/misc/misc";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";

export class StatusModal extends Modal {
	selectProviderCallback: (calendarProvider: CalendarProvider, ref: any) => void;
    submitCredentialsCallback: (submitObject: any, ref: any) => Promise<boolean>;
	submitMfaCallback: (code: string, ref: any) => Promise<boolean>;
	cloudStatus: CloudStatus;
	selectedProvider: CalendarProvider;
	ref: any;

    constructor(app: App,
				selectProviderCallback: (calendarProvider: CalendarProvider, ref: any) => void,
				submitCredentialsCallback: (submitObject: any, ref: any) => Promise<boolean>,
				submitMfaCallback: (code: string, ref: any) => Promise<boolean>,
				ref: any){
        super(app);
		this.selectProviderCallback = selectProviderCallback;
        this.submitCredentialsCallback = submitCredentialsCallback;
		this.submitMfaCallback = submitMfaCallback;
		this.cloudStatus = CloudStatus.NOT_STARTED;
		this.ref = ref;
    }

    onOpen() {
		if(this.cloudStatus == CloudStatus.NOT_STARTED){
			this.loadServiceProviderSelection();
		}
		else if(this.cloudStatus == CloudStatus.PROVIDER_SELECTED && this.selectedProvider == CalendarProvider.APPLE){
			this.loadAppleLogin();
		}
		else if(this.cloudStatus == CloudStatus.PROVIDER_SELECTED && this.selectedProvider == CalendarProvider.GOOGLE){
			this.loadGoogleLogin();
		}
		else if (this.cloudStatus == CloudStatus.MFA_REQ){
			this.loadMFA();
		}
		else if (this.cloudStatus == CloudStatus.WAITING){
			this.loadLoggingIn();
		}
		else if (this.cloudStatus == CloudStatus.LOGGED){
			this.loadLoggedIn();
		} else {
			this.loadServiceProviderSelection();
		}
    }

	loadServiceProviderSelection(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("icalModalSize");
		contentEl.createEl("h1", {text: "Select your service provider"}).addClass("icalSettingTitle");
		const serviceProviderRow = contentEl.createEl("div");
		serviceProviderRow.addClass("icalServiceProviderRow");
		const appleButton = serviceProviderRow.createEl("div");
		appleButton.addClass("icalServiceProviderButton");
		const appleIcon = appleButton.createEl("img");
		appleIcon.addClass("icalServiceIcon");
		appleIcon.setAttribute("src", Misc.getBase64AppleIcon());
		const googleButton = serviceProviderRow.createEl("div");
		googleButton.addClass("icalServiceProviderButton");
		const googleIcon = googleButton.createEl("img");
		googleIcon.addClass("icalServiceIcon");
		googleIcon.setAttribute("src", Misc.getBase64GoogleIcon());

		appleButton.onClickEvent(() => {
			this.selectedProvider = CalendarProvider.APPLE;
			this.selectProviderCallback(this.selectedProvider, this.ref);
		})

		googleButton.onClickEvent(() => {
			this.selectedProvider = CalendarProvider.GOOGLE;
			this.selectProviderCallback(this.selectedProvider, this.ref);
		})
	}

	loadAppleLogin(){
		let username: string;
		let pw: string;
		const { contentEl } = this;
		contentEl.empty();
		const flexBox = contentEl.createEl("div");
		flexBox.addClass("icalTitleFlexBox");
		const goBackButton = new Setting(flexBox).addButton((btn) =>
			btn
				.setIcon("arrow-big-left")
				.setCta()
				.onClick(() => {
					this.selectedProvider = CalendarProvider.NOT_SELECTED;
					this.selectProviderCallback(this.selectedProvider, this.ref);
					this.loadServiceProviderSelection();
				}));
		goBackButton.settingEl.addClass("icalGoBackButton");
		const title = flexBox.createEl("h1", {text: "Insert your iCloud credentials"});
		title.addClass("icalSettingTitle");
		flexBox.createEl("div");

		const usernameSetting = new Setting(contentEl)
			.setName("iCloud username")
			.addText((text) => text.onChange((newText) => username = newText));
		usernameSetting.settingEl.addClass("icalSetting")
		const passwordSetting = new Setting(contentEl)
			.setName("iCloud password")
			.addText((text) => text.onChange((newText) => {
				pw = newText;
				text.inputEl.type = "password";
			}))
		passwordSetting.settingEl.addClass("icalSetting")
		const submitButton = new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						const auth = new Map<string, string>();
						auth.set("iCalSyncUsername", username);
						auth.set("iCalSyncPassword", pw);
						this.submitCredentialsCallback(auth, this.ref).then(success => {
							if (!success) this.error();
						})
						this.loading();
					}));
		submitButton.settingEl.addClass("icalSetting")
	}

	loadGoogleLogin(){
		this.submitCredentialsCallback(null, this.ref).then(success => {
			if (!success) this.error();
		})
		this.loading();
	}

	loading(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Logging in..."}).addClass("icalSettingTitle");
	}

	error(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "There has been an error logging in..."}).addClass("icalSettingTitle");
		contentEl.createEl("b", {text: `For more information check the console [cmd + alt + I]`}).addClass("icalSetting");
	}

	loadMFA(){
		let mfa: string;
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Insert the 2FA code"}).addClass("icalSettingTitle");
		const codeSetting = new Setting(contentEl)
			.setName("code")
			.addText((text) => text.onChange((newText) => mfa = newText));
		codeSetting.settingEl.addClass("icalSetting");
		const submitButton = new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => this.submitMfaCallback(mfa, this.ref).then(success => {
						if (!success) this.error();
						else this.loadLoggedIn();
					})));
		submitButton.settingEl.addClass("icalSetting");
	}

	loadLoggingIn(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Logging in..."}).addClass("icalSettingTitle");
	}

	loadLoggedIn(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "All set!"}).addClass("icalSettingTitle");
		const loginStatusRow = contentEl.createEl("div");
		loginStatusRow.addClass("icalLoggedInSummaryRow");
		loginStatusRow.createEl("h5", {text: "Status: "});
		loginStatusRow.createEl("h5", {text: " Correctly logged-in 🟢"})
		const calendarProviderRow = contentEl.createEl("div");
		calendarProviderRow.addClass("icalLoggedInSummaryRow");
		calendarProviderRow.createEl("h5", {text: `Calendar provider:`});
		calendarProviderRow.createEl("h5", {text: `${CalendarProvider[this.selectedProvider]}`});
		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Change calendar")
				.setCta()
				.onClick(() => {
					this.selectedProvider = CalendarProvider.NOT_SELECTED;
					this.selectProviderCallback(this.selectedProvider, this.ref);
					this.loadServiceProviderSelection();
				}));
	}

	updateModal(cloudStatus: CloudStatus){
		this.cloudStatus = cloudStatus;
		this.onOpen();
	}

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
