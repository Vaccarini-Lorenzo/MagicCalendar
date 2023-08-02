
// This proxy can not be used since it opens a server embedded in the electron app (obsidian) and therefore
// it's not possible to bypass CORS

/*

import express, {Express} from "express";
import {Server} from "http";
import cors from 'cors';

class CORSProxy {
	private _app: Express;
	private _port: number;
	private _server: Server
	proxyUrl: string;

	constructor(port: number) {
		this._app = express();
		this._port = port;
		this.proxyUrl = `http://localhost:${this._port}/proxy`
	}

	start(){
		this._server = this._app.listen(this._port, () => console.log("Started proxy server"));
	}

	registerMiddlewares(){
		this._app.use(express.json());
		this._app.use((req, res, next) => {
			res.append('Access-Control-Allow-Origin', ['*']);
			res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
			res.append('Access-Control-Allow-Headers', '*');
			res.append('Access-Control-Expose-Headers', '*')
			next();
		});
	}

	registerRoutes(){
		this._app.post("/proxy", async (req, res) => {
			const url = this.filterUrl(req.url);
			console.log("Req received:" + url);
			const method = req.body["method"];
			const headers = req.body["headers"];
			const body = req.body["body"];
			const options = {
				method,
				headers,
			}

			if (body != undefined){
				options["body"] = JSON.stringify(body)
			}

			//let testUrl = `https://leeward-scalloped-aphid.glitch.me/test`
			const fetchRes = await fetch(url, options);
			res.status(fetchRes.status);
			fetchRes.headers.forEach((value, key) => {
				res.set(key, value);
				if(key.toString().toLowerCase() == "set-cookie"){
					res.set('forward-cookie', value);
					res.set('set-cookie', value);
				}
				if(key.toString().toLowerCase() == "access-control-allow-origin"){
					console.log("found 'Access-Control-Allow-Origin'");
					res.set("Access-Control-Allow-Origin", "app://obsidian.md")
				}
				if(key.toString().toLowerCase() == "access-control-expose-headers"){
					res.set("Access-Control-Expose-Headers", "*")
				}
				if(key.toString().toLowerCase() == "content-encoding"){
					res.removeHeader(key);
				}
				if(key.toString().toLowerCase() == "content-length"){
					res.removeHeader(key);
				}
				console.log(`h: ${key} -> ${value}`);
			})
			let json = await fetchRes.json();
			console.log(`request processed with status:${fetchRes.status}\n\n\n\n\n\n`);
			res.json(json);
		});
	}

	stop(){
		this._server.close(() => console.log("Shutting down proxy server"));
	}

	async fetch(input, init?){
		console.log(JSON.stringify(init));
		return await fetch(input, init);
	}

	filterUrl(url) {
		const firstQueryMarkIndex = url.indexOf("?url=") + 5;
		const filteredUrl = url.substring(firstQueryMarkIndex);
		return filteredUrl;
	}
}

const proxy = new CORSProxy(3000);
export default proxy;

 */
