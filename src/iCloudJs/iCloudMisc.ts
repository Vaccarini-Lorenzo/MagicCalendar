import {RequestInfo, RequestInit, Response} from "node-fetch";
import {requestUrl, RequestUrlParam} from "obsidian";

class ICloudMisc {
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
		const requestUrlParam = {
			url: url.toString(),
			method: init.method ?? "GET",
			headers: init.headers,
			body: init.body
		}

		let requestUrlResponse;
		try{
			requestUrlResponse = await requestUrl(requestUrlParam as RequestUrlParam);
		} catch (e){
			console.warn("Error requestingUrl:", e);
			console.warn(e.code);
			console.warn(e.toString());
			/*

			This logic must be moved

			if (e.toString() == "Error: Request failed, status 421"){
				const canTryReconnect = iCloudController.checkMaxReconnectAttempt();
				if(!canTryReconnect){
					console.warn("Can't reconnect - max attempts reached");
					return;
				}
				console.warn("Refreshing token...");
				await iCloudController.tryAuthentication("", "")
				await iCloudController.awaitReady();
				iCloudController.resetReconnectAttempt();
				iCloudController.refreshRequestCookies(requestUrlParam);
				requestUrlResponse = await requestUrl(requestUrlParam as RequestUrlParam);
			}
			else if(e.toString() == "Error: net::ERR_NAME_NOT_RESOLVED"){
				console.warn("Internet connection error");
			}

			 */
		}

		const setCookieField = requestUrlResponse.headers["set-cookie"] as any;
		let setCookieString = "";

		if (setCookieField != undefined){
			setCookieField.forEach(setCookie => {
				setCookieString += `${setCookie.split(";")[0]}, `
			})
			requestUrlResponse.headers["forward-cookie"] = setCookieString;
		}

		const responseInit = {
			headers: requestUrlResponse.headers,
			status: requestUrlResponse.status,
			statusText: requestUrlResponse.status.toString(),
			url: url.toString()
		};

		const responseWrapper = new Response(requestUrlResponse.arrayBuffer, responseInit)
		return responseWrapper;
	}
}

const iCloudMisc = new ICloudMisc();
export default iCloudMisc;



