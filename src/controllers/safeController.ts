import {readFileSync, writeFile, writeFileSync} from "fs";
import crypto from "crypto";
import dotenv from "dotenv"

export default class SafeController {
	path: string;
	_username: { encryptedData: string };
	_pw: { encryptedData: string };
	_key: Buffer;
	_iv: Buffer;
	_algorithm: string;

	injectPath(path: string){
		this.path = `${path}/.c.txt`;
		dotenv.config({path: `${path}/.env`});
		this._key = Buffer.from(process.env.KEY).slice(0, 32);
		this._iv = Buffer.from(process.env.IV).slice(0, 16);
		this._algorithm = process.env.ALG;
	}

	checkSafe(): boolean{
		try{
			const data = readFileSync(this.path).toString();
			const lines = data.split("\n");
			if(lines.length == 2){
				console.log("Found something in safe");
				this._username = lines[0] as any;
				this._pw = lines[1] as any;
				return true;
			}
			console.log("Safe is empty");
			return false;
		} catch (e) {
			if (e.code == 'ENOENT'){
				console.log("c file not found: creating it");
				writeFileSync(this.path, "");
			}
			return false;
		}
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
		const encryptUser = JSON.stringify(this.encrypt(username));
		const encryptPw = JSON.stringify(this.encrypt(password));
		try {
			writeFile(this.path, `${encryptUser}\n${encryptPw}`, ()=>{});
		} catch (e){
			console.log("error storing credentials");
		}
	}

	encrypt(text) {
		const cipher = crypto.createCipheriv(this._algorithm, Buffer.from(this._key), this._iv.toString('hex').slice(0, 16));
		let encrypted = cipher.update(text);
		encrypted = Buffer.concat([encrypted, cipher.final()]);
		return { encryptedData: encrypted.toString('hex') };
	}

	decrypt(text) {
		const textObj = JSON.parse(text);
		const encryptedText = Buffer.from(textObj.encryptedData, 'hex');
		const decipher = crypto.createDecipheriv(this._algorithm, Buffer.from(this._key), this._iv.toString('hex').slice(0, 16));
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	}
}
