import EventEmitter from "events";
import os from "os";
import path from "path";
import {iCloudAuthenticationStore} from "./authStore";
import {
	APNS_ENDPOINT,
	APNS_GET_TOKEN_ENDPOINT,
	APNS_TOKEN_REGISTRATION_ENDPOINT,
	AUTH_ENDPOINT,
	AUTH_HEADERS,
	DEFAULT_HEADERS,
	SETUP_ENDPOINT
} from "./consts";
import {iCloudAccountDetailsService} from "./account";
import {iCloudCalendarService} from "./calendar";
import {AccountInfo} from "./types";
import iCloudMisc from "./iCloudMisc";
import safeController from "../controllers/safeController";
import {Misc} from "../misc/misc";
export type { iCloudAuthenticationStore } from "./authStore";
export type { AccountInfo } from "./types";
/**
 * These are the options that can be passed to the iCloud service constructor.
 */
export interface iCloudServiceSetupOptions {
    /**
     * The username of the iCloud account to log in to.
     * Can be provided now (at construction time) or later (on iCloudService#authenticate).
     */
    username?: string;
    /**
     * The password of the iCloud account to log in to.
     * Can be provided now (at construction time) or later (on iCloudService#authenticate).
     */
    password?: string;
    /**
     * Whether to save the credentials to the system's secret store.
     * (i.e. Keychain on macOS)
     */
    saveCredentials?: boolean;
    /**
     * Whether to store the trust-token to disk.
     * This allows future logins to be done without MFA.
     */
    trustDevice?: boolean;
    /**
     * The directory to store the trust-token in.
     * Defaults to the ~/.icloud directory.
     */
    dataDirectory?: string;
}
/**
 * The state of the iCloudService.
 */
export const enum iCloudServiceStatus {
    // iCloudService#authenticate has not been called yet.
    NotStarted = "NotStarted",
    // Called after iCloudService#authenticate was called and local validation of the username & password was verified.
    Started = "Started",
    // The user needs to be prompted for the MFA code, which can be provided by calling iCloudService#provideMfaCode
    MfaRequested = "MfaRequested",
    //  The MFA code was successfully validated.
    Authenticated = "Authenticated",
    // Authentication has succeeded.
    Trusted = "Trusted",
    // The iCloudService is ready for use.
    Ready = "Ready",
    // The authentication failed.
    Error = "Error"
}

/**
 * The main iCloud service class
 * It serves as a central manager for logging in and exposes all other services.
 * @example ```ts
const icloud = new iCloud({
    username: "johnny.appleseed@icloud.com",
    password: "hunter2",
    saveCredentials: true,
    trustDevice: true
});
await icloud.authenticate();

if (icloud.status === "MfaRequested") {
    await icloud.provideMfaCode("123456");
}
await icloud.awaitReady;


```
 */
export default class iCloudService extends EventEmitter {
    /**
     * The authentication store for this service instance.
     * Manages cookies & trust tokens.
     */
    authStore: iCloudAuthenticationStore;
    /**
     * The options for this service instance.
     */
    options: iCloudServiceSetupOptions;

    /**
     * The status of the iCloudService.
     */
    status: iCloudServiceStatus = iCloudServiceStatus.NotStarted;

    /*
        Has PCS (private/protected cloud service?) enabled.
        The check is implemented by checking if the `isDeviceConsentedForPCS` key is present in the `requestWebAccessState` object.
    */
    pcsEnabled?: boolean;
    /**
     * PCS access is granted.
     */
    pcsAccess?: boolean;
    /**
     * Has ICRS (iCloud Recovery Service) disabled.
     * This should only be true when iCloud Advanced Data Protection is enabled.
     */
    ICDRSDisabled?: boolean;

    accountInfo?: AccountInfo;
	
    /**
     * A promise that can be awaited that resolves when the iCloudService is ready.
     * Will reject if an error occurs during authentication.
     */
    awaitReady = new Promise((resolve, reject) => {
        this.on(iCloudServiceStatus.Ready, resolve);
        this.on(iCloudServiceStatus.Error, reject);
    });

    constructor(options: iCloudServiceSetupOptions,) {
        super();
        this.options = options;
        if (!this.options.dataDirectory) this.options.dataDirectory = path.join(os.homedir(), ".icloud");
        this.authStore = new iCloudAuthenticationStore(options);
    }

    private _setState(state: iCloudServiceStatus, ...args: any[]) {
        console.debug("[icloud] State changed to:", state);
        this.status = state;
        this.emit(state, ...args);
    }

    /**
     * Authenticates to the iCloud service.
     * If a username is not passed to this function, it will use the one provided to the options object in the constructor, failing that, it will find the first result in the system's keychain matching https://idmsa.apple.com
     * The same applies to the password. If it is not provided to this function, the options object will be used, and then it will check the keychain for a keychain matching the email for idmsa.apple.com
     * @param username The username to use instead of the one provided in this iCloudService's options
     * @param password The password to use instead of the one provided in this iCloudService's options
     */
    async authenticate(username?: string, password?: string) {
        username = username || this.options.username;
        password = password || this.options.password;

        if (typeof (username as any) !== "string") throw new TypeError("authenticate(username?: string, password?: string): 'username' was " + (username || JSON.stringify(username)).toString());
        this.options.username = username;
        // hide password from console.log
        Object.defineProperty(this.options, "password", {
            enumerable: false, // hide it from for..in
            value: password
        });
        if (!username) throw new Error("Username is required");
        if (!password) throw new Error("Password is required");

        this.authStore.loadTrustToken(this.options.username);

        this._setState(iCloudServiceStatus.Started);
        try {
            const authData = { accountName: this.options.username, password: this.options.password, trustTokens: [] };
            if (this.authStore.trustToken) authData.trustTokens.push(this.authStore.trustToken);
            const authResponse = await iCloudMisc.wrapRequest(`${AUTH_ENDPOINT}signin?isRememberMeEnabled=true`, { headers: AUTH_HEADERS, method: "POST", body: JSON.stringify(authData) });
            if (authResponse.status == 200) {
                if (this.authStore.processAuthSecrets(authResponse)) {
                    this._setState(iCloudServiceStatus.Trusted);
                    this._getiCloudCookies();
                } else {
                    throw new Error("Unable to process auth response!");
                }
            } else if (authResponse.status == 409) {
                if (this.authStore.processAuthSecrets(authResponse)) {
                    this._setState(iCloudServiceStatus.MfaRequested);
                } else {
                    throw new Error("Unable to process auth response!");
                }
            } else {
                if (authResponse.status == 401) {
                    throw new Error("Recieved 401 error. Incorrect password? (" + authResponse.status + ", " + await authResponse.text() + ")");
                }
                throw new Error("Invalid status code: " + authResponse.status + ", " + await authResponse.text());
            }
        } catch (e) {
            this._setState(iCloudServiceStatus.Error, e);
            throw e;
        }
    }

    /**
     * Call this to provide the MFA code that was sent to the user's devices.
     * @param code The six digit MFA code.
     */
    async provideMfaCode(code: string) {
        if (typeof (code as any) !== "string") throw new TypeError("provideMfaCode(code: string): 'code' was " + code.toString());
        code = code.replace(/\D/g, "");
        if (code.length !== 6) console.warn("[icloud] Provided MFA wasn't 6-digits!");

        if (!this.authStore.validateAuthSecrets()) {
            throw new Error("Cannot provide MFA code without calling authenticate first!");
        }
        const authData = { securityCode: { code } };
		const authResponse = await iCloudMisc.wrapRequest(
            AUTH_ENDPOINT + "verify/trusteddevice/securitycode",
            { headers: this.authStore.getMfaHeaders(), method: "POST", body: JSON.stringify(authData)}
        );
        if (authResponse.status == 200) {
            this._setState(iCloudServiceStatus.Authenticated);
            if (this.options.trustDevice) this._getTrustToken().then(this._getiCloudCookies.bind(this));
            else this._getiCloudCookies();
        } else {
			this._setState(iCloudServiceStatus.Error);
        }
    }

    private async _getTrustToken() {
        if (!this.authStore.validateAuthSecrets()) {
            throw new Error("Cannot get auth token without calling authenticate first!");
        }
        console.debug("[icloud] Trusting device");
        const authResponse = await iCloudMisc.wrapRequest(
            AUTH_ENDPOINT + "2sv/trust",
            { headers: this.authStore.getMfaHeaders() }
        );
        if (this.authStore.processAccountTokens(this.options.username, authResponse)) {
            this._setState(iCloudServiceStatus.Trusted);
        } else {
            console.error("[icloud] Unable to trust device!");
        }
    }

	async getAPNSToken(){
		const pushTopics = ["73f7bfc9253abaaa423eba9a48e9f187994b7bd9","dce593a0ac013016a778712b850dc2cf21af8266","8a40cb6b1d3fcd0f5c204504eb8fb9aa64b78faf","aa8e84b1f216a86051a7b722b7717825381a1228","c6f942949291a6163bee3240dc8de0613e43009a"];
		const pushTokenTTL = 43200;
		const body = {pushTopics, pushTokenTTL};

		const ASNGetTokenResponse = await iCloudMisc.wrapRequest(APNS_GET_TOKEN_ENDPOINT, {headers: this.authStore.getHeaders(), method: "POST", body: JSON.stringify(body)});
		const responseBody = await ASNGetTokenResponse.json();
		
		this.authStore.pushToken = responseBody.pushToken;
		this.authStore.pushTokenTTL = pushTokenTTL;
	}

	async registerAPNSToken(){
		const clientID = Misc.generateICloudUUID();
		this.authStore.APSNClientID = clientID;
		const apnsEnvironment = "production";
		const apnsToken = this.authStore.pushToken;
		const body = {apnsEnvironment, apnsToken, clientID};
		const ASNRegisterTokenResponse = await iCloudMisc.wrapRequest(APNS_TOKEN_REGISTRATION_ENDPOINT, {headers: this.authStore.getHeaders(), method: "POST", body: JSON.stringify(body)});
		
		const responseBody = await ASNRegisterTokenResponse.json();
		
	}

	startAPNS(APNSNotificationCallback: () => void) {
		iCloudMisc.wrapRequest(`${APNS_ENDPOINT}?tok=${this.authStore.pushToken}&ttl=${this.authStore.pushTokenTTL}&clientId=${this.authStore.APSNClientID}`, {}).then(updateResponse => {
			APNSNotificationCallback();
			updateResponse.json().then(json => this.startAPNS(APNSNotificationCallback));
		})
	}

    private async _getiCloudCookies() {
        try {
            const data = {
                dsWebAuthToken: this.authStore.sessionToken,
                trustToken: this.authStore.trustToken
            };
            const response = await iCloudMisc.wrapRequest(SETUP_ENDPOINT, { headers: DEFAULT_HEADERS, method: "POST", body: JSON.stringify(data) });
            if (response.status == 200) {
                if (this.authStore.processCloudSetupResponse(response)) {
                    try {
                        this.accountInfo = await response.json();
                    } catch (e) {
                        console.warn("[icloud] Could not get account info:", e);
                    }

                    try {
                        await this.checkPCS();
                    } catch (e) {
                        console.warn("[icloud] Could not get PCS state:", e);
                    }


                    this._setState(iCloudServiceStatus.Ready);
                    try {
						const credentialMap = new Map<string, string>();
						credentialMap.set("magicCalendarSyncUsername", this.options.username.toString());
						credentialMap.set("magicCalendarSyncPassword", this.options.password.toString());
						if (this.options.saveCredentials) safeController.storeCredentials(credentialMap);
                    } catch (e) {
                        console.warn("[icloud] Unable to save account credentials:", e);
                    }
                } else {
                    throw new Error("Unable to process cloud setup response!");
                }
            } else {
                throw new Error("Invalid status code: " + response.status);
            }
        } catch (e) {
            this._setState(iCloudServiceStatus.Error, e);
            throw e;
        }
    }


    /**
     * Updates the PCS state (iCloudService.pcsEnabled, iCloudService.pcsAccess, iCloudService.ICDRSDisabled).
     */
    async checkPCS() {
        const pcsTest = await iCloudMisc.wrapRequest("https://setup.icloud.com/setup/ws/1/requestWebAccessState", { headers: this.authStore.getHeaders(), method: "POST" });
		
        if (pcsTest.status == 200) {
            const j = await pcsTest.json();
            this.pcsEnabled = typeof j.isDeviceConsentedForPCS == "boolean";
            this.pcsAccess = this.pcsEnabled ? j.isDeviceConsentedForPCS : true;
            this.ICDRSDisabled = j.isICDRSDisabled || false;
        } else {
            throw new Error("checkPCS: response code " + pcsTest.status);
        }
    }

    private _serviceCache: {[key: string]: any} = {};
    /**
     * A mapping of service names to their classes.
     * This is used by {@link iCloudService.getService} to return the correct service class.
     * @remarks You should **not** use this to instantiate services, use {@link iCloudService.getService} instead.
     * @see {@link iCloudService.getService}
     */
    serviceConstructors: {[key: string]: any} = {
        account: iCloudAccountDetailsService,
        calendar: iCloudCalendarService,
    };

    // Returns an instance of the 'account' (Account Details) service.
    getService(service: "account"): iCloudAccountDetailsService;
    // Returns an instance of the 'findme' (Find My) service.
    /**
     * Returns an instance of the 'ubiquity' (Legacy iCloud Documents) service.
     * @deprecated
     */
    // Returns an instance of the 'calendar' (iCloud Calendar) service.
    getService(service: "calendar"): iCloudCalendarService
    /**
     * Returns an instance of the specified service. Results are cached, so subsequent calls will return the same instance.
     * @param service The service name to return an instance of. Must be one of the keys in {@link iCloudService.serviceConstructors}.
     * @returns {iCloudService}
     */
    getService(service:string) {
        if (!this.serviceConstructors[service]) throw new TypeError(`getService(service: string): 'service' was ${service.toString()}, must be one of ${Object.keys(this.serviceConstructors).join(", ")}`);
        if (service === "photos") {
			this._serviceCache[service] = new this.serviceConstructors[service](this, this.accountInfo.webservices.ckdatabasews.url);
        }
		if (!this._serviceCache[service]) {
			this._serviceCache[service] = new this.serviceConstructors[service](this, this.accountInfo.webservices[service].url);
        }
		return this._serviceCache[service];
    }
}
