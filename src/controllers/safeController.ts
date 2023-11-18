import crypto from "crypto";
import {SettingInterface} from "../plugin/appSetting";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";

class SafeController {
	settings: SettingInterface;
	_credentialsMap: Map<string, string>;
	_key: Buffer;
	_iv: Buffer;
	_algorithm: string;
	_calendarProvider: CalendarProvider;


	constructor() {
		this._credentialsMap = new Map<string, string>();
	}

	injectSettings(settings: SettingInterface){
		this.settings = settings;
		this._key = Buffer.from(this.settings.key).slice(0, 32);
		this._iv = Buffer.from(this.settings.iv).slice(0, 16);
		this._algorithm = "aes-256-cbc";
	}

	injectCalendarProvider(calendarProvider: CalendarProvider){
		this._calendarProvider = calendarProvider;
	}

	checkSafe(): boolean{
		if (this._calendarProvider == CalendarProvider.NOT_SELECTED) return false;
		if (this._calendarProvider == CalendarProvider.APPLE){
			const username = localStorage.getItem("magicCalendarSyncUsername");
			const password = localStorage.getItem("magicCalendarSyncPassword");
			if (username == undefined || password == undefined) return false;
			this._credentialsMap.set("magicCalendarSyncUsername", username);
			this._credentialsMap.set("magicCalendarSyncPassword", password);
			return true;
		}

		const accessToken = localStorage.getItem("accessToken");
		const refreshToken = localStorage.getItem("refreshToken");
		const clientId = localStorage.getItem("clientId");
		const clientSecret = localStorage.getItem("clientSecret");
		const tokenType = localStorage.getItem("tokenType");

		if (accessToken == undefined || refreshToken == undefined || clientId == undefined || tokenType == undefined || clientSecret == undefined) return false;

		this._credentialsMap.set("accessToken", accessToken);
		this._credentialsMap.set("refreshToken", refreshToken);
		this._credentialsMap.set("clientId", clientId);
		this._credentialsMap.set("tokenType", tokenType);
		this._credentialsMap.set("clientSecret", clientSecret);
		return true;
	}

	getCredentials(): Map<string, string>{
		const decryptedMap = new Map<string, string>();
		Array.from(this._credentialsMap.entries()).forEach(credentialEntry => {
			const decryptedValue = this.decrypt(credentialEntry[1]);
			decryptedMap.set(credentialEntry[0], decryptedValue);
		})
		return decryptedMap;
	}

	storeCredentials(credentials: Map<string, string>){
		Array.from(credentials.entries()).forEach(credentialEntry => {
			const encryptedValue = this.encrypt(credentialEntry[1]);
			this._credentialsMap.set(credentialEntry[0], encryptedValue);
			localStorage.setItem(credentialEntry[0], encryptedValue);
		})
	}

	encrypt(text) {
		const cipher = crypto.createCipheriv(this._algorithm, Buffer.from(this._key), this._iv.toString('hex').slice(0, 16));
		let encrypted = cipher.update(text);
		encrypted = Buffer.concat([encrypted, cipher.final()]);
		return encrypted.toString('hex');
	}

	decrypt(text) {
		const encryptedText = Buffer.from(text, 'hex');
		const decipher = crypto.createDecipheriv(this._algorithm, Buffer.from(this._key), this._iv.toString('hex').slice(0, 16));
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	}
}

const safeController = new SafeController();
export default safeController;
