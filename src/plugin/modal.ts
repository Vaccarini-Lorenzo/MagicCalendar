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
			this.loadGoogleTemporaryScreen();
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
		contentEl.addClass("magicCalendarModalSize");
		contentEl.createEl("h1", {text: "Select your service provider"}).addClass("magicCalendarSettingTitle");
		const serviceProviderRow = contentEl.createEl("div");
		serviceProviderRow.addClass("magicCalendarServiceProviderRow");
		const appleButton = serviceProviderRow.createEl("div");
		appleButton.addClass("magicCalendarServiceProviderButton");
		const appleIcon = appleButton.createEl("img");
		appleIcon.addClass("magicCalendarServiceIcon");
		appleIcon.setAttribute("src", Misc.getBase64AppleIcon());
		const googleButton = serviceProviderRow.createEl("div");
		googleButton.addClass("magicCalendarServiceProviderButton");
		const googleIcon = googleButton.createEl("img");
		googleIcon.addClass("magicCalendarServiceIcon");
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
		flexBox.addClass("magicCalendarTitleFlexBox");
		const goBackButton = new Setting(flexBox).addButton((btn) =>
			btn
				.setIcon("arrow-big-left")
				.setCta()
				.onClick(() => {
					this.selectedProvider = CalendarProvider.NOT_SELECTED;
					this.selectProviderCallback(this.selectedProvider, this.ref);
					this.loadServiceProviderSelection();
				}));
		goBackButton.settingEl.addClass("magicCalendarGoBackButton");
		const title = flexBox.createEl("h1", {text: "Insert your iCloud credentials"});
		title.addClass("magicCalendarSettingTitle");
		flexBox.createEl("div");

		const usernameSetting = new Setting(contentEl)
			.setName("iCloud username")
			.addText((text) => text.onChange((newText) => username = newText));
		usernameSetting.settingEl.addClass("magicCalendarSetting")
		const passwordSetting = new Setting(contentEl)
			.setName("iCloud password")
			.addText((text) => text.onChange((newText) => {
				pw = newText;
				text.inputEl.type = "password";
			}))
		passwordSetting.settingEl.addClass("magicCalendarSetting")
		const submitButton = new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						const auth = new Map<string, string>();
						auth.set("magicCalendarSyncUsername", username);
						auth.set("magicCalendarSyncPassword", pw);
						this.submitCredentialsCallback(auth, this.ref).then(success => {
							if (!success) this.error();
						})
						this.loading();
					}));
		submitButton.settingEl.addClass("magicCalendarSetting")
	}

	loadGoogleTemporaryScreen(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "This is still a beta!"}).addClass("magicCalendarSettingTitle");
		contentEl.createEl("b", {text: `At the moment this is still a beta!`}).addClass("magicCalendarSetting");
		contentEl.createEl("b", {text: `The developer is waiting for Google Trust & Safety team's review.`}).addClass("magicCalendarSetting");
		contentEl.createEl("b", {text: `If you want you can still continue`}).addClass("magicCalendarSetting");
		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Continue")
				.setCta()
				.onClick(() => {
					this.loadGoogleLogin();
				}));
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
		contentEl.createEl("h1", {text: "Logging in..."}).addClass("magicCalendarSettingTitle");
	}

	error(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "There has been an error logging in..."}).addClass("magicCalendarSettingTitle");
		contentEl.createEl("b", {text: `For more information check the console [cmd + alt + I]`}).addClass("magicCalendarSetting");
	}

	loadMFA(){
		let mfa: string;
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Insert the 2FA code"}).addClass("magicCalendarSettingTitle");
		const codeSetting = new Setting(contentEl)
			.setName("code")
			.addText((text) => text.onChange((newText) => mfa = newText));
		codeSetting.settingEl.addClass("magicCalendarSetting");
		const submitButton = new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => this.submitMfaCallback(mfa, this.ref).then(success => {
						if (!success) this.error();
						else this.loadLoggedIn();
					})));
		submitButton.settingEl.addClass("magicCalendarSetting");
	}

	loadLoggingIn(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Logging in..."}).addClass("magicCalendarSettingTitle");
	}

	loadLoggedIn(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "All set!"}).addClass("magicCalendarSettingTitle");
		const loginStatusRow = contentEl.createEl("div");
		loginStatusRow.addClass("magicCalendarLoggedInSummaryRow");
		loginStatusRow.createEl("h5", {text: "Status: "});
		loginStatusRow.createEl("h5", {text: " Logged in 🟢"})
		const calendarProviderRow = contentEl.createEl("div");
		calendarProviderRow.addClass("magicCalendarLoggedInSummaryRow");
		calendarProviderRow.createEl("h5", {text: `Calendar provider:`});
		if (this.selectedProvider == undefined) return;
		let calendarProviderString = CalendarProvider[this.selectedProvider].toLowerCase();
		calendarProviderString = calendarProviderString.charAt(0).toUpperCase() + calendarProviderString.substring(1);
		calendarProviderRow.createEl("h5", {text: `${calendarProviderString}`});
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
