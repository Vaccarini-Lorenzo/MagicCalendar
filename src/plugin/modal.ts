import {App, Modal, Setting} from "obsidian";
import {iCloudServiceStatus} from "../iCloudJs";
import {text} from "stream/consumers";

export class iCloudStatusModal extends Modal {
    submitCredentials: (username: string, pw: string, ref: any) => Promise<void>;
	submitMfa: (code: string, ref: any) => Promise<void>;
	iCloudStatus: iCloudServiceStatus;
	ref: any;

    constructor(app: App,
				submitCallback: (username: string, pw: string, ref: any) => Promise<void>,
				submitMfa: (code: string, ref: any) => Promise<void>,
				ref: any){
        super(app);
        this.submitCredentials = submitCallback;
		this.submitMfa = submitMfa;
		this.iCloudStatus = iCloudServiceStatus.NotStarted;
		this.ref = ref;
    }

    onOpen() {
		if(this.iCloudStatus == iCloudServiceStatus.NotStarted){
			this.loadLogin();
		}
		else if (this.iCloudStatus == iCloudServiceStatus.MfaRequested){
			this.loadMFA();
		}
		else if (this.iCloudStatus == iCloudServiceStatus.Started){
			this.loadSigningIn();
		}
		else if (this.iCloudStatus == iCloudServiceStatus.Ready || this.iCloudStatus == iCloudServiceStatus.Trusted){
			this.loadSignedIn();
		}
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
			.addText((text) => text.onChange((newText) => pw = newText));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.submitCredentials(username, pw, this.ref)
					}));
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

	updateModal(iCloudStatus: iCloudServiceStatus){
		this.iCloudStatus = iCloudStatus;
		this.onOpen();
	}

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
