import {DateRange} from "./dateRange";
import {CloudEvent} from "./events/cloudEvent";

export class CacheCheck {
	missedDateRanges: DateRange[];
	cachedCloudEvents: CloudEvent[];

	constructor(missedDateRanges: DateRange[], cachedCloudEvents: CloudEvent[]) {
		this.missedDateRanges = missedDateRanges;
		this.cachedCloudEvents = cachedCloudEvents;
	}
}
