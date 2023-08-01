export const CLIENT_ID = "d39ba9916b7251055b22c7f910e2ea796ee65e98b2ddecea8f5dde8d9d1a815d";

export const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:103.0) Gecko/20100101 Firefox/103.0",
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: "https://www.icloud.com"
};

export const AUTH_HEADERS = {
    ...DEFAULT_HEADERS,
    Origin: "https://idmsa.apple.com",
    Referer: "https://idmsa.apple.com/",
    "X-Apple-Widget-Key": CLIENT_ID,
    "X-Apple-OAuth-Client-Id": CLIENT_ID,
    "X-Apple-I-FD-Client-Info": JSON.stringify({
        U: DEFAULT_HEADERS["User-Agent"],
        L: "en-GB",
        Z: "GMT+01:00",
        V: "1.1",
        F: ""
    }),
    "X-Apple-OAuth-Response-Type": "code",
    "X-Apple-OAuth-Response-Mode": "web_message",
    "X-Apple-OAuth-Client-Type": "firstPartyAuth"
};

export const AUTH_ENDPOINT = "https://idmsa.apple.com/appleauth/auth/";
export const BASE_ENDPOINT = "https://www.icloud.com/";
export const SETUP_ENDPOINT = "https://setup.icloud.com/setup/ws/1/accountLogin";
