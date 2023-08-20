import fs from "fs";
import { Response } from "node-fetch";
import path from "path";
import { Cookie } from "tough-cookie";
import { iCloudServiceSetupOptions } from "./index";
import { AUTH_HEADERS, DEFAULT_HEADERS } from "./consts";

export class iCloudAuthenticationStore {
    /**
     * The options provided to the iCloudService that owns this AuthenticationStore
     */
    options: iCloudServiceSetupOptions;
    /**
     * The exact file path to the base file name of the trust token file.
     * @default "~/.icloud/.trust-token"
     * @remarks The actual file name will be tknFile + "-" + base64(lowercase(username))
     */
    tknFile: string;


    trustToken?: string;
    sessionId?: string;
    sessionToken?: string;
    scnt?: string;
    aasp?: string;
    icloudCookies: Cookie[];

    constructor(options: iCloudServiceSetupOptions) {
        this.options = options;
        this.tknFile = path.format({ dir: options.dataDirectory, base: ".trust-token" });

        Object.defineProperty(this, "trustToken", { enumerable: false, writable: true });
        Object.defineProperty(this, "sessionId", { enumerable: false, writable: true });
        Object.defineProperty(this, "sessionToken", { enumerable: false, writable: true });
        Object.defineProperty(this, "scnt", { enumerable: false, writable: true });
        Object.defineProperty(this, "aasp", { enumerable: false, writable: true });
        Object.defineProperty(this, "icloudCookies", { enumerable: false, writable: true });
    }

    /**
     * Loads a trust token from disk
     * @param account The account to load the trust token for
     */
    loadTrustToken(account: string) {
        try {
            this.trustToken = fs.readFileSync(this.tknFile + "-" + Buffer.from(account.toLowerCase()).toString("base64"), "utf8");
        } catch (e) {
            console.debug("[icloud] Unable to load trust token:", e.toString());
        }
    }
    /**
     * Writes a trust token to disk
     * @param account The account to write the trust token for
     */
    writeTrustToken(account: string) {
        try {
            if (!fs.existsSync(this.options.dataDirectory)) fs.mkdirSync(this.options.dataDirectory);
            require("fs").writeFileSync(this.tknFile + "-" + Buffer.from(account.toLowerCase()).toString("base64"), this.trustToken);
        } catch (e) {
            console.warn("[icloud] Unable to write trust token:", e.toString());
        }
    }

    /**
     * Processes a successful iCloud sign in response.
     * Sets this authenticationStore's sessionId, sessionToken, scnt, and aasp properties.
     * @param authResponse The response from the sign in request
     * @returns {boolean} True if the secrets are all present, false otherwise.
     */
    processAuthSecrets(authResponse: Response) {
        try {
			this.sessionId = authResponse.headers.get("X-Apple-Session-Token");
            this.sessionToken = this.sessionId;
            this.scnt = authResponse.headers.get("scnt");

            const headers = Array.from(authResponse.headers.values());
            const aaspCookie = headers.find((v) => v.includes("aasp="));
            this.aasp = aaspCookie.split("aasp=")[1].split(";")[0];
            return this.validateAuthSecrets();
        } catch (e) {
            console.warn("[icloud] Unable to process auth secrets:", e.toString());
            return false;
        }
    }
    /**
     * Parses cookies from a response and adds them to the authenticationStore's icloudCookies property.
     * @param cloudSetupResponse The response from the iCloud setup request
     * @returns {boolean} True if cookies were found, false otherwise.
     */
	// Error here
    processCloudSetupResponse(cloudSetupResponse: Response) {
		this.icloudCookies = Array.from(cloudSetupResponse.headers.entries())
            .filter((v) => v[0].toLowerCase() == "forward-cookie")
            .map((v) => v[1].split(", "))
            .reduce((a, b) => a.concat(b), [])
            .map((v) => Cookie.parse(v))
            .filter((v) => !!v);
        return !!this.icloudCookies.length;
    }
    /**
     * Sets this authenticationStore's trustToken and sessionToken properties.
     * Also writes the trust token to disk.
     * @param account Username of the account
     * @param trustResponse Response to the 2sv/trust request.
     * @returns
     */
    processAccountTokens(account:string, trustResponse: Response) {
        this.sessionToken = trustResponse.headers.get("x-apple-session-token");
        this.trustToken = trustResponse.headers.get("x-apple-twosv-trust-token");
        this.writeTrustToken(account);
        return this.validateAccountTokens();
    }
    /**
     * Parses a list of cookies and adds them to the authenticationStore's icloudCookies property.
     * @param cookies A list of cookies to add in the format of a Set-Cookie header.
     */
    addCookies(cookies: string[]) {
        cookies.map((v) => Cookie.parse(v)).forEach((v) => this.icloudCookies.push(v));
    }

    // Gets the headers required for a MFA request
    getMfaHeaders() {
        return { ...AUTH_HEADERS, scnt: this.scnt, "X-Apple-ID-Session-Id": this.sessionId, Cookie: "aasp=" + this.aasp };
    }
    // Gets the authentication headers required for a request.
    getHeaders() {
        return { ...DEFAULT_HEADERS, Cookie: this.icloudCookies.filter((a) => a.value).map((cookie) => cookie.cookieString()).join("; ") };
    }

    // Returns true if sessionToken and trustToken are present.
    validateAccountTokens() {
        return this.sessionToken && this.trustToken;
    }
    // Returns true if aasp, scnt and sessionId are present.
    validateAuthSecrets() {
        return this.aasp && this.scnt && this.sessionId;
    }
}
