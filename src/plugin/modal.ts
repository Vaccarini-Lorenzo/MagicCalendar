import {App, Modal, Setting} from "obsidian";
import {Misc} from "src/misc/misc";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";

export class iCloudStatusModal extends Modal {
    submitCredentials: (username: string, pw: string, ref: any) => Promise<boolean>;
	submitMfa: (code: string, ref: any) => Promise<void>;
	cloudStatus: CloudStatus;
	selectedProvider: CalendarProvider;
	ref: any;

    constructor(app: App,
				submitCallback: (username: string, pw: string, ref: any) => Promise<boolean>,
				submitMfa: (code: string, ref: any) => Promise<void>,
				ref: any,
				selectedProvider?: CalendarProvider){
        super(app);
		this.selectedProvider = selectedProvider;
        this.submitCredentials = submitCallback;
		this.submitMfa = submitMfa;
		this.cloudStatus = CloudStatus.NOT_STARTED;
		this.ref = ref;
    }

    onOpen() {
		if(this.cloudStatus == CloudStatus.NOT_STARTED){
			this.loadServiceProviderSelection();
		}
		if(this.cloudStatus == CloudStatus.PROVIDER_SELECTED && this.selectedProvider == CalendarProvider.APPLE){
			this.loadLogin();
		}
		if(this.cloudStatus == CloudStatus.PROVIDER_SELECTED && this.selectedProvider == CalendarProvider.GOOGLE){
			//this.loadLogin();
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
			this.loadLogin();
		}
    }

	loadServiceProviderSelection(){
		const { contentEl } = this;
		contentEl.createEl("h1", {text: "Select your service provider"});
		const serviceProviderRow = contentEl.createEl("div");
		serviceProviderRow.addClass("serviceProviderRow");
		const appleButton = serviceProviderRow.createEl("div");
		appleButton.addClass("serviceProviderButton");
		appleButton.onClickEvent(() => console.log("HERE!"));
		const appleIcon = appleButton.createEl("img");
		appleIcon.addClass("serviceIcon");
		appleIcon.setAttribute("src", Misc.getBase64AppleIcon());
		const googleButton = serviceProviderRow.createEl("div");
		googleButton.addClass("serviceProviderButton");
		googleButton.onClickEvent(() => console.log("Google"));
		const googleIcon = googleButton.createEl("img");
		googleIcon.addClass("serviceIcon");
		googleIcon.setAttribute("src", Misc.getBase64GoogleIcon());
	}

	loadLogin(){
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
						this.submitCredentials(username, pw, this.ref).then(success => {
							if (!success) this.error();
						})
						this.loading();
					}));

		contentEl.createEl("h6", {text: "Why do I need to insert my iCloud credentials?"})
		contentEl.createEl("p", {text: "Unfortunately iCloud doesn't support OAuth and the only way to authenticate is trough iCloud credentials. Your credentials will be stored EXCLUSIVELY in your local device, encrypted."})

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
					.onClick(() => this.submitMfa(mfa, this.ref)));
	}

	loadSigningIn(){
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", {text: "Signing in..."});
		contentEl.createEl("h3", {text: "If the CORS proxy server is offline it may take a little bit, be patient"});
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
