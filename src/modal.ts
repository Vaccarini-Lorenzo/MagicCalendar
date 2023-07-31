import {App, Modal, Setting} from "obsidian";
import {iCloudServiceStatus} from "./iCloudJs";

export class ExampleModal extends Modal {
    submitCallback: (username: string, pw: string) => Promise<iCloudServiceStatus>;
    constructor(app: App, submitCallback: (username: string, pw: string) => Promise<iCloudServiceStatus>) {
        super(app);
        this.submitCallback = submitCallback;
    }

    onOpen() {
        let username: string;
        let pw: string;
        let { contentEl } = this;
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
                        let loginStatus = await this.submitCallback(username, pw);
						console.log(loginStatus);
                        this.updateUI();
                    }));
    }

    updateUI(){
        let { contentEl } = this;
        contentEl.empty();
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
