import { ReadableStream } from "stream/web";
import iCloudService from "./index";
import Misc from "./misc";

export type ItemType = "APP_LIBRARY" | "FILE" | "FOLDER";

export interface iCloudDriveItem {
    dateCreated: Date;
    drivewsid: string;
    docwsid: string;
    zone: "com.apple.CloudDocs";
    name: string;
    parentId: string;
    isChainedToParent?: boolean;
    dateModified?: Date;
    dateChanged?: Date;
    size?: number;
    etag: string;
    type: ItemType;
    extension?: string;
    lastOpenTime?: Date;
    assetQuota?: number;
    fileCount?: number;
    shareCount?: number;
    shareAliasCount?: number;
    directChildrenCount?: number;
    maxDepth?: "ANY";
    icons?: {
        url: string;
        type: "OSX" | "IOS";
        size: number;
    }[];
    supportedExtensions?: string[];
    supportedTypes?: string[];
}
export class iCloudDriveRawNode {
    dateCreated: string;
    drivewsid: string;
    docwsid: string;
    zone: "com.apple.CloudDocs";
    name: string;
    etag: string;
    type: ItemType;
    assetQuota: number;
    fileCount: number;
    shareCount: number;
    shareAliasCount: number;
    directChildrenCount: number;
    items: iCloudDriveItem[];
    numberOfItems: number;
    status: string;
    parentId?: string;
}


export class iCloudDriveNode {
    service: iCloudDriveService;
    serviceUri: string;
    nodeId: string;

    rawData: iCloudDriveRawNode;
    hasData = false;
    lastUpdated: number;

    dateCreated: Date;
    name: string;
    etag: string;
    type: ItemType;
    size: number;
    fileCount: number;
    shareCount: number;
    directChildrenCount: number;
    parentId?: string;
    items: iCloudDriveItem[];


    constructor(service: iCloudDriveService, nodeId = "root") {
        this.service = service;
        this.serviceUri = service.serviceUri;
        this.nodeId = nodeId;
    }

    async refresh() {
        const response = await Misc.wrapRequest(this.serviceUri + "/retrieveItemDetailsInFolders", {
            headers: this.service.service.authStore.getHeaders(),
            method: "POST",
            body: JSON.stringify([{
                drivewsid: this.nodeId,
                partialData: false
            }])
        });
        let json = await response.json();
        if (json.errorCode) throw new Error(json.errorReason);
        if (Array.isArray(json)) json = json[0];
        const rawNode = json as iCloudDriveRawNode;
        this.hasData = true;
        this.lastUpdated = Date.now();
        this.rawData = rawNode;
        this.dateCreated = new Date(rawNode.dateCreated);
        this.name = rawNode.name;
        this.etag = rawNode.etag;
        this.type = rawNode.type;
        this.size = rawNode.assetQuota;
        this.fileCount = rawNode.fileCount;
        this.shareCount = rawNode.shareCount;
        this.directChildrenCount = rawNode.directChildrenCount;
        this.items = rawNode.items;
        this.parentId = rawNode.parentId;



        return this;
    }
}

export class iCloudDriveService {
    service: iCloudService;
    serviceUri: string;
    docsServiceUri: string;
    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        this.docsServiceUri = service.accountInfo.webservices.docws.url;
    }
    async getNode(nodeId: {drivewsid: string} | string = "FOLDER::com.apple.CloudDocs::root") {
        return new iCloudDriveNode(this,
            typeof nodeId === "string" ? nodeId : nodeId.drivewsid
        ).refresh();
    }
    async downloadFile(item: {zone?: string, docwsid: string, size?: number}) {
        if (item.size === 0) {
            return new ReadableStream({
                start(controller) {
                    controller.close();
                }
            });
        }
        const response = await Misc.wrapRequest(this.docsServiceUri + `/ws/${item.zone || "com.apple.CloudDocs"}/download/by_id?document_id=` + encodeURIComponent(item.docwsid), { headers: this.service.authStore.getHeaders() });
        const json = await response.json();
        if (json.error_code) throw new Error(json.reason);
        const url = json.data_token ? json.data_token.url : json.package_token.url;
        const fileResponse = await Misc.wrapRequest(url, { headers: this.service.authStore.getHeaders() });
        return fileResponse.body;
    }
    async mkdir(parent: {drivewsid: string } | string, name: string) {
        const parentId = typeof parent === "string" ? parent : parent.drivewsid;
        const response = await Misc.wrapRequest(this.serviceUri + "/createFolders", {
            headers: this.service.authStore.getHeaders(),
            method: "POST",
            body: JSON.stringify({
                destinationDrivewsId: parentId,
                folders: [{
                    name, clientId: "auth-ab95dcd4-65db-11ed-a792-244bfee1e3c1"
                }]
            })
        });
        return response.json();
    }
    async del(item: {drivewsid: string, etag: string} | string, etag?: string) {
        const drivewsid = typeof item === "string" ? item : item.drivewsid;
        const itemEtag = typeof item === "string" ? etag : item.etag;
        const response = await Misc.wrapRequest(this.serviceUri + "/moveItemsToTrash", {
            headers: this.service.authStore.getHeaders(),
            method: "POST",
            body: JSON.stringify({
                items: [
                    {
                        drivewsid,
                        etag: itemEtag,
                        clientId: "auth-ab95dcd4-65db-11ed-a792-244bfee1e3c1"
                    }
                ]
            })
        });
        return response.json();
    }
}
