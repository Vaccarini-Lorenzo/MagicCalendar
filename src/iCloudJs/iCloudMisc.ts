import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";

export default class iCloudMisc {
    private static stringifyDateNumber(dateNumber: number): string {
        return dateNumber.toString().length == 1 ? "0" + dateNumber.toString() : dateNumber.toString()
    }

    static stringifyDateArray(dateArray: number[]){
        return `${iCloudMisc.stringifyDateNumber(dateArray[0])}-${iCloudMisc.stringifyDateNumber(dateArray[1])}-${iCloudMisc.stringifyDateNumber(dateArray[2])}`;
    }

    private static getDateComponents(date: Date): {[key:string]: number}{
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const hour = date.getHours();
        const minutes = date.getMinutes();
        return {
            year,
            month,
            day,
            hour,
            minutes
        }
    }

    static getArrayDate(date: Date) {
        const dateComponents = iCloudMisc.getDateComponents(date);
        // TODO: Understand wtf is this
        const arbitrary = 240;
        const monthString = dateComponents.month.toString().length == 1 ? "0" + dateComponents.month.toString() : dateComponents.month.toString();
        const completeDate = Number(`${dateComponents.year}${monthString}${dateComponents.day}`)
        return [completeDate, dateComponents.year, dateComponents.month, dateComponents.day, dateComponents.hour, dateComponents.minutes, arbitrary];
    }

    static getRandomHex(max: number): string{
        return (Math.floor(Math.random() * max)).toString(16).toUpperCase();
    }

	static async wrapRequest(url: RequestInfo, init?: RequestInit): Promise<Response>{
		//const newUrl = `https://leeward-scalloped-aphid.glitch.me/proxy?url=${url}`;
		//const newUrl = `http://localhost:3000/proxy?url=${url}`
		const newUrl = `https://icalobsidiansyncproxy.onrender.com/proxy?url=${url}`;
		const embeddedBody = {
			method: init.method ?? "GET",
			headers: init.headers,
		}

		if(init.body != undefined){
			embeddedBody["body"] = JSON.parse(init.body as string);
		}

		const newInit = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(embeddedBody)
		}
		const fetchResponse = await fetch(newUrl, newInit);
		console.log("Got response from the proxy!")
		/*
		Array.from(fetchResponse.headers.entries()).forEach(h => {
			console.log(`h: ${h[0]} -> ${h[1]}`);
		})
		console.log("\n\n\n\n\n");
		 */
		return fetchResponse;
	}
}


