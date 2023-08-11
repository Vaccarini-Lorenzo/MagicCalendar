import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";

class ICloudMisc {
	private proxyEndpoint: string;

	setProxyEndpoint(proxyEndpoint: string){
		this.proxyEndpoint = proxyEndpoint;
	}

    private stringifyDateNumber(dateNumber: number): string {
        return dateNumber.toString().length == 1 ? "0" + dateNumber.toString() : dateNumber.toString()
    }

    stringifyDateArray(dateArray: number[]){
        return `${this.stringifyDateNumber(dateArray[1])}-${this.stringifyDateNumber(dateArray[2])}-${this.stringifyDateNumber(dateArray[3])}`;
    }

    private getDateComponents(date: Date): {[key:string]: number}{
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

    getArrayDate(date: Date) {
        const dateComponents = this.getDateComponents(date);
        // TODO: Understand wtf is this
        const arbitrary = 240;
        const monthString = dateComponents.month.toString().length == 1 ? "0" + dateComponents.month.toString() : dateComponents.month.toString();
        const completeDate = Number(`${dateComponents.year}${monthString}${dateComponents.day}`)
        return [completeDate, dateComponents.year, dateComponents.month, dateComponents.day, dateComponents.hour, dateComponents.minutes, arbitrary];
    }

    getRandomHex(max: number): string{
        return (Math.floor(Math.random() * max)).toString(16).toUpperCase();
    }

	async wrapRequest(url: RequestInfo, init?: RequestInit): Promise<Response>{

		const newUrl = `${this.proxyEndpoint}?url=${url}`;
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
		return fetchResponse;
	}
}

const iCloudMisc = new ICloudMisc();
export default iCloudMisc;



