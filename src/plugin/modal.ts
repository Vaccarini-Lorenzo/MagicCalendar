import {App, Modal, Setting} from "obsidian";
import {iCloudServiceStatus} from "../iCloudJs";

export class iCloudStatusModal extends Modal {
    submitCredentials: (username: string, pw: string, ref: any) => Promise<boolean>;
	submitMfa: (code: string, ref: any) => Promise<void>;
	iCloudStatus: iCloudServiceStatus;
	ref: any;

    constructor(app: App,
				submitCallback: (username: string, pw: string, ref: any) => Promise<boolean>,
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
		contentEl.createEl("h2", {text: "The server is starting..."});
		contentEl.createEl("p", {text: "Unfortunately to communicate with iCloud it's necessary to go through a proxy. The proxy at the moment is a Render's free instance and you might experience a cold start, give it few seconds."});
		contentEl.createEl("b", {text: "The server is placed near Frankfurt: If you activated 2FA you'll probably see a request coming from the server location" });
		contentEl.createEl("h2", {text: "Is it taking too long? You can start your own proxy server!"})
		contentEl.createEl("p", {text: "Check the plugin README.md for more info"});
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

	updateModal(iCloudStatus: iCloudServiceStatus){
		this.iCloudStatus = iCloudStatus;
		this.onOpen();
	}

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
