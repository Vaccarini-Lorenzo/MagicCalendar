import Event from "../model/event";
import {DateRange} from "../model/dateRange";
import {CloudEvent} from "../model/events/cloudEvent";
import {SettingInterface} from "../plugin/appSetting";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";

export class CloudController {
	async pushEvent(event: Event): Promise<boolean>{return false;}

	async getEvents(missedDateRange: DateRange): Promise<CloudEvent[]> {return [];}

	injectPath(pluginPath: string) {}

	injectSettings(settings: SettingInterface) {}

	async tryAuthentication(auth: any): Promise<CloudStatus> {return CloudStatus.ERROR;}

	async MFACallback(code: string): Promise<CloudStatus> {return CloudStatus.ERROR;}

	async preloadData() {}

	getCalendarNames() {return [];}
}
