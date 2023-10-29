import {DateRange} from "../model/dateRange";
import {CloudEvent} from "../model/events/cloudEvent";
import {SettingInterface} from "../plugin/appSetting";
import {CloudStatus} from "../model/cloudCalendar/cloudStatus";

export interface CloudController {
	pushEvent(cloudEvent: CloudEvent): Promise<boolean>;

	updateEvent(cloudEvent: CloudEvent): Promise<boolean>;

	getEvents(missedDateRange: DateRange): Promise<CloudEvent[]>;

	injectPath(pluginPath: string);

	injectSettings?(settings: SettingInterface);

	tryAuthentication(auth: Map<string,string>): Promise<CloudStatus>;

	MFACallback?(code: string): Promise<CloudStatus>;

	preloadData();

	getCalendarNames();

	managePushNotifications(): void;
}
