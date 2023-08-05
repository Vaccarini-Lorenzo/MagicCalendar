import iCloudService from "./index";
import iCloudMisc from "./iCloudMisc";

export class iCloudUbiquityService {
    service: iCloudService;
    dsid: string;
    serviceUri: string;
    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        this.dsid = this.service.accountInfo.dsInfo.dsid;
    }
    async getNode(nodeId = 0, type: "item" | "file" | "parent" = "item") {
        const response = await iCloudMisc.wrapRequest(this.serviceUri + "/ws/" + this.dsid + "/" + type + "/" + nodeId, { headers: this.service.authStore.getHeaders() });
        const json = await response.text();
        if (json == "Account migrated") throw new Error("Ubiquity not supported on this account");
        return JSON.parse(json);
    }
}
