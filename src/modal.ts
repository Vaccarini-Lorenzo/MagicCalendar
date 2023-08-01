import {App, Modal, Setting} from "obsidian";
import {iCloudServiceStatus} from "./iCloudJs";

export class ExampleModal extends Modal {
    submitCredentials: (username: string, pw: string) => Promise<iCloudServiceStatus>;
	submitMfa: (code: string) => Promise<iCloudServiceStatus>;

    constructor(app: App,
				submitCallback: (username: string, pw: string) => Promise<iCloudServiceStatus>,
				submitMfa: (code: string) => Promise<iCloudServiceStatus>){
        super(app);
        this.submitCredentials = submitCallback;
		this.submitMfa = submitMfa;
    }

    onOpen() {
		let username: string;
		let pw: string;
        const { contentEl } = this;
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
                    .onClick(async () => {
                        const loginStatus = await this.submitCredentials(username, pw);
						console.log("loginStatus = " + loginStatus);
                        this.checkStatus(loginStatus);
                    }));
    }

	checkStatus(loginStatus: iCloudServiceStatus){
		let mfa: string;
		const { contentEl } = this;
        contentEl.empty();
		contentEl.createEl("h1", {text: `The login status is ${loginStatus}`})
		if(loginStatus === iCloudServiceStatus.MfaRequested){
			new Setting(contentEl)
				.setName("code")
				.addText((text) => text.onChange((newText) => mfa = newText));
		}
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(async () => {
						await this.submitMfa(mfa);
					}));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
