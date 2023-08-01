import express from 'express'
import process from 'process'
import fetch from 'node-fetch'
import bodyParser from 'body-parser'

const app = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(process.env.PORT, () => console.log(`listening to port ${process.env.PORT}`));

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

app.post('/', (req, res) => {
	console.log("test POST");
	res.set({
		"test": "AAA"
	});
	res.status(200);
	console.log(JSON.stringify(res.headers));
	res.send();
})

app.post("/test", (req,res) => {
	console.log("TESTING...")
	console.log(req);
})

app.post("/proxy", async (req, res) => {
	console.log("Req received");
	const url = filterUrl(req.url);
	const method = req.body["method"];
	const headers = req.body["headers"];
	const body = req.body["body"];
	const options = {
		method,
		headers,
		body: JSON.stringify(body)
	}
	const testUrl = `https://leeward-scalloped-aphid.glitch.me/test`
	let fetchRes = await fetch(url, options);
	fetchRes.headers.forEach((value, key) => {
		res.set(key, value);
		if(key === "set-cookie"){
			res.set('forward-cookie', value);
		}
	})
	//console.log("set cookie:" + fetchRes.headers["set-cookie"])
	res.status(fetchRes.status);
	console.log(JSON.stringify(res.headers));
	res.send();
});


function filterUrl(url) {
	const firstQueryMarkIndex = url.indexOf("?url=") + 5;
	return url.substring(firstQueryMarkIndex);
}
