import {CacheCheck} from "../model/cacheCheck";
import {DateRange} from "../model/dateRange";

class CacheController {
	// TODO: Implement
	checkCache(dateRange: DateRange): CacheCheck {
		return new CacheCheck([dateRange], []);
	}
}

const cacheController = new CacheController();
export default cacheController;
