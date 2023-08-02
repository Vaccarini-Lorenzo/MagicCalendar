import express from 'express'
import fetch from 'node-fetch'
import bodyParser from 'body-parser'
import dotenv from 'dotenv';

/*

		The following simple server is currently hosted on render and acts as a CORS proxy
		since Obsidian (an electron app) can't bypass its environment CORS policy

 */

dotenv.config();
const app = express()
const port = process.env.PORT;
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, () => console.log(`listening to port ${port}`));

app.use((req, res, next) => {
	res.append('Access-Control-Allow-Origin', ['*']);
	res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.append('Access-Control-Allow-Headers', '*');
	res.append('Access-Control-Expose-Headers', '*')
	next();
});

app.get('/', (req, res)=>{
	res.send("Working");
})

app.post("/proxy", async (req, res) => {
	const url = filterUrl(req.url);
	console.log("Req received:" + url);
	const method = req.body["method"];
	const headers = req.body["headers"];
	const body = req.body["body"];
	const options = {
		method,
		headers,
	}

	if (body !== undefined){
		options["body"] = JSON.stringify(body)
	}

	let testUrl = `https://leeward-scalloped-aphid.glitch.me/test`
	let fetchRes = await fetch(url, options);
	res.status(fetchRes.status);
	fetchRes.headers.forEach((value, key) => {
		res.set(key, value);
		if(key.toString().toLowerCase() === "set-cookie"){
			res.set('forward-cookie', value);
			res.set('set-cookie', value);
		}
		if(key.toString().toLowerCase() === "access-control-allow-origin"){
			console.log("found 'Access-Control-Allow-Origin'");
			res.set("Access-Control-Allow-Origin", "app://obsidian.md")
		}
		if(key.toString().toLowerCase() === "access-control-expose-headers"){
			res.set("Access-Control-Expose-Headers", "*")
		}
		if(key.toString().toLowerCase() === "content-encoding"){
			res.removeHeader(key);
		}
		if(key.toString().toLowerCase() === "content-length"){
			res.removeHeader(key);
		}
		console.log(`h: ${key} -> ${value}`);
	})
	console.log(`request processed with status:${fetchRes.status}\n\n\n\n\n\n`);
	try{
		let json = await fetchRes.json();
		res.json(json);
	} catch (e){
		console.log("Error parsing the json: Body not forwarded");
		res.send();
	}

});


function filterUrl(url) {
	const firstQueryMarkIndex = url.indexOf("?url=") + 5;
	const filteredUrl = url.substring(firstQueryMarkIndex);
	return filteredUrl;
}
