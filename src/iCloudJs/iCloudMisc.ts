import {RequestInfo, RequestInit, Response} from "node-fetch";
import {requestUrl, RequestUrlParam} from "obsidian";

class ICloudMisc {
	private _refreshCallback: (requestUrlParam: RequestUrlParam) => void;

	injectRefreshCallback(refreshCallback:  (requestUrlParam: RequestUrlParam) => void){
		this._refreshCallback = refreshCallback;
	}

	private stringifyDateNumber(dateNumber: number): string {
		return dateNumber.toString().length == 1 ? "0" + dateNumber.toString() : dateNumber.toString()
	}

	stringifyDateArray(dateArray: number[]){
		return `${this.stringifyDateNumber(dateArray[1])}-${this.stringifyDateNumber(dateArray[2])}-${this.stringifyDateNumber(dateArray[3])}`;
	}

	private getDateComponents(date: Date): {[key:string]: number}{
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
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
		const arbitrary = 240;
		const monthString = dateComponents.month.toString().length == 1 ? "0" + dateComponents.month.toString() : dateComponents.month.toString();
		const completeDate = Number(`${dateComponents.year}${monthString}${dateComponents.day}`)
		return [completeDate, dateComponents.year, dateComponents.month, dateComponents.day, dateComponents.hour, dateComponents.minutes, arbitrary];
	}

	getRandomHex(max: number): string{
		return (Math.floor(Math.random() * max)).toString(16).toUpperCase();
	}

	async wrapRequest(url: RequestInfo, init?: RequestInit): Promise<Response>{
		const requestUrlParam = {
			url: url.toString(),
			method: init.method ?? "GET",
			headers: init.headers,
			body: init.body,
			throw: false
		} as RequestUrlParam

		let requestUrlResponse;
		let responseInit;
		try {
			requestUrlResponse = await requestUrl(requestUrlParam);
			const setCookieField = requestUrlResponse.headers["set-cookie"] as any;
			let setCookieString = "";

			if (setCookieField != undefined){
				setCookieField.forEach(setCookie => {
					setCookieString += `${setCookie.split(";")[0]}, `
				})
				requestUrlResponse.headers["forward-cookie"] = setCookieString;
			}
			responseInit = {
				headers: requestUrlResponse.headers,
				status: requestUrlResponse.status,
				statusText: requestUrlResponse.status.toString(),
				url: url.toString()
			};

			if (requestUrlResponse.status != 200){
				console.warn(url.toString());
				console.warn(requestUrlResponse.status);
			}

			if (requestUrlResponse.status == 204){
				responseInit.status = 200;
			}

			if (requestUrlResponse.status != 200){
				console.warn("requestUrlResponse status: ", requestUrlResponse.status);
			}

			if (requestUrlResponse.status == 421){
				this._refreshCallback(requestUrlParam);
				requestUrlResponse = await requestUrl(requestUrlParam as RequestUrlParam);
				console.warn("Refreshing token...");
			}
		} catch (e) {
			if(e.toString() == "Error: net::ERR_NAME_NOT_RESOLVED"){
				console.warn("Internet connection error");
			}
		}
		let responseWrapper;
		if (requestUrlResponse.arrayBuffer) responseWrapper = new Response(requestUrlResponse.arrayBuffer, responseInit)
		else responseWrapper = new Response(responseInit)
		return responseWrapper;
	}
}

const iCloudMisc = new ICloudMisc();
export default iCloudMisc;
