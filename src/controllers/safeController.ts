import crypto from "crypto";
import {SettingInterface} from "../plugin/appSetting";
import {CalendarProvider} from "../model/cloudCalendar/calendarProvider";

class SafeController {
	_pluginPath: string;
	_path: string;
	settings: SettingInterface;
	_username: string;
	_pw: string;
	_token: string;
	_key: Buffer;
	_iv: Buffer;
	_algorithm: string;

	injectPath(pluginPath: string){
		this._pluginPath = pluginPath;
		this._path = `${pluginPath}/.c.txt`;
	}

	injectSettings(settings: SettingInterface){
		this.settings = settings;
		this._key = Buffer.from(this.settings.key).slice(0, 32);
		this._iv = Buffer.from(this.settings.iv).slice(0, 16);
		this._algorithm = "aes-256-cbc";
	}

	checkSafe(calendarProvider: CalendarProvider): boolean{
		if (calendarProvider == CalendarProvider.NOT_SELECTED) return false;
		if (calendarProvider == CalendarProvider.APPLE){
			const username = localStorage.getItem("iCalSyncUsername");
			const pw = localStorage.getItem("iCalSyncPassword");
			if (username == undefined || pw == undefined) return false;
			this._username = username;
			this._pw = pw;
			return true;
		}
		const token = localStorage.getItem("googleCalendarToken");
		if (token == undefined) return false;
		this._token = token;
		return true;
	}

	getCredentials(): {username: string, password: string}{
		const decryptUser = this.decrypt(this._username);
		const decryptPw = this.decrypt(this._pw);
		return {
			username: decryptUser,
			password: decryptPw
		}
	}

	storeCredentials(username: string, password: string){
		const encryptUser = this.encrypt(username);
		const encryptPw = this.encrypt(password);
		localStorage.setItem("iCalSyncUsername", encryptUser);
		localStorage.setItem("iCalSyncPassword", encryptPw);
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
