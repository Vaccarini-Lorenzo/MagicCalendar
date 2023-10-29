import {OAuth2Client} from 'google-auth-library';
import * as http from "http";
import {Misc} from "../misc/misc";
export class GoogleAuthenticator {
	private scopes: string[];

	constructor(scopes: string[]) {
		this.scopes = scopes;
	}

	async authenticate(): Promise<OAuth2Client>{
		// Consider opening a loading page

		let credentials = Misc.credentials;
		while (!credentials){
			console.log("credentials not ready yet...");
			await Misc.sleep(200);
			credentials = Misc.credentials;
		}
		// create an oAuth client to authorize the API call
		const client = new OAuth2Client({
			clientId: credentials.client_id,
			clientSecret: credentials.client_secret,
		});

		return new Promise((resolve, reject) => {
			const server = http.createServer(async (req, res) => {
				try {
					const url = new URL(req.url!, "http://localhost:3000");
					const searchParams = url.searchParams;
					if (searchParams.has('error')) {
						res.end('Authorization rejected.');
						reject(new Error(searchParams.get('error')!));
						return;
					}
					if (!searchParams.has('code')) {
						res.end('No authentication code provided.');
						reject(new Error('Cannot read authentication code.'));
						return;
					}

					const code = searchParams.get('code');
					const {tokens} = await client.getToken({
						code: code!,
						redirect_uri: "http://localhost:3000"
					});
					client.credentials = tokens;
					resolve(client);
					res.end('Authentication successful! Please return to the console.');
				} catch (e) {
					reject(e);
				} finally {
					server.close();
				}
			});

			const listenPort = 0;

			try {
				setTimeout(function() {
					server.close();
					console.warn("Timeout [30s]: closing oauth server");
				}, 30000);

				server.listen(listenPort, () => {
					const address = server.address();
					// open the browser to the authorize url to start the workflow
					const authorizeUrl = client.generateAuthUrl({
						redirect_uri: "http://localhost:3000",
						access_type: 'offline',
						scope: this.scopes.join(' '),
					});
					open(authorizeUrl);
				});
			} catch (e) {
				if (e.code == "EADDRINUSE") {
					console.warn("Address in use, the server connection will be closed soon...");
				} else {
					console.warn("OAuth server error: ", e);
				}
			}
		});
	}
}
