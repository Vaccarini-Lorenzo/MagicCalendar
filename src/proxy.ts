
// This proxy can not be used since it opens a server embedded in the electron app (obsidian) and therefore
// it's not possible to bypass CORS

import express, {Express} from "express";
import {Server} from "http";
import cors from "cors";

/*

class CORSProxy {
	private _app: Express;
	private _port: number;
	private _server: Server
	proxyUrl: string;

	constructor(port: number) {
		this._app = express();
		this._port = port;
		this.proxyUrl = `http://localhost:${this._port}/proxy`

		this._app.options(
			"*",
			cors({
				origin: "*"
				})
		);

		this._app.use(
			cors({
				origin: "*"
			})
		);

		this._app.use(express.json());
	}

	start(){
		this._server = this._app.listen(this._port, () => console.log("Started proxy server"));
	}

	registerRoutes(){
		this._app.post("/proxy", (req, res) => {
			console.log("Req received");
			const url = this.filterUrl(req.url);
			const method = req.body["method"];
			const headers = req.body["headers"];
			const body = req.body["body"];
			const options = {
				method,
				headers,
				body: JSON.stringify(body)
			}
			console.log(JSON.stringify(options));
			//let testUrl = `https://leeward-scalloped-aphid.glitch.me/test`
			fetch(url, options).then((fetchRes) => {
				fetchRes.headers.forEach((value, key) => {
					res.setHeader(key, value);
				})
				console.log(fetchRes)
				res.status(fetchRes.status);
			})
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
