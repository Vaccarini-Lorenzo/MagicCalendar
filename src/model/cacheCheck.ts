import {DateRange} from "./dateRange";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";

export class CacheCheck {
	missedDateRanges: DateRange[];
	cachedICouldEvents: iCloudCalendarEvent[];

	constructor(missedDateRanges: DateRange[], cachedICouldEvents: iCloudCalendarEvent[]) {
		this.missedDateRanges = missedDateRanges;
		this.cachedICouldEvents = cachedICouldEvents;
	}
}
