import {App, Modal, Setting} from "obsidian";
import {Misc} from "src/misc/misc";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";

export class StatusModal extends Modal {
	selectProviderCallback: (calendarProvider: CalendarProvider, ref: any) => void;
    submitCredentialsCallback: (submitObject: any, ref: any) => Promise<boolean>;
	submitMfaCallback: (code: string, ref: any) => Promise<void>;
	cloudStatus: CloudStatus;
	selectedProvider: CalendarProvider;
	ref: any;

    constructor(app: App,
				selectProviderCallback: (calendarProvider: CalendarProvider, ref: any) => void,
				submitCredentialsCallback: (submitObject: any, ref: any) => Promise<boolean>,
				submitMfaCallback: (code: string, ref: any) => Promise<void>,
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
			this.loadSigningIn();
		}
		else if (this.cloudStatus == CloudStatus.LOGGED){
			this.loadSignedIn();
		} else {
			this.loadServiceProviderSelection();
		}
    }

	loadServiceProviderSelection(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Select your service provider"});
		const serviceProviderRow = contentEl.createEl("div");
		serviceProviderRow.addClass("serviceProviderRow");
		const appleButton = serviceProviderRow.createEl("div");
		appleButton.addClass("serviceProviderButton");
		const appleIcon = appleButton.createEl("img");
		appleIcon.addClass("serviceIcon");
		appleIcon.setAttribute("src", Misc.getBase64AppleIcon());
		const googleButton = serviceProviderRow.createEl("div");
		googleButton.addClass("serviceProviderButton");
		const googleIcon = googleButton.createEl("img");
		googleIcon.addClass("serviceIcon");
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
		contentEl.createEl("h1", {text: "Insert your iCloud credentials"});
		new Setting(contentEl)
			.setName("username")
			.addText((text) => text.onChange((newText) => username = newText));
		new Setting(contentEl)
			.setName("pw")
			.addText((text) => text.onChange((newText) => {
				pw = newText;
				text.inputEl.type = "password";
			}))
		new Setting(contentEl)
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

		contentEl.createEl("h6", {text: "Why do I need to insert my iCloud credentials?"})
		contentEl.createEl("p", {text: "Unfortunately iCloud doesn't support OAuth and the only way to authenticate is trough iCloud credentials. Your credentials will be stored EXCLUSIVELY in your local device, encrypted."})
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
		contentEl.createEl("h1", {text: "Logging in..."});
		contentEl.createEl("h2", {text: "If you activated 2FA in your iCloud account you might be asked to insert a code"});
	}

	error(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "There has been an error logging in..."});
		contentEl.createEl("b", {text: `For more information check the console [cmd + alt + I]`});
	}

	loadMFA(){
		let mfa: string;
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Insert the 2FA code"});
		new Setting(contentEl)
			.setName("code")
			.addText((text) => text.onChange((newText) => mfa = newText));
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => this.submitMfaCallback(mfa, this.ref)));
	}

	loadSigningIn(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Signing in..."});
	}

	loadSignedIn(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "You're correctly logged in!"});
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
