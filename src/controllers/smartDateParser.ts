import {casual, Chrono, Component, ParsedResult} from "chrono-node";
import {ParsedComponents} from "chrono-node/dist/cjs/types";

class SmartDateParser {
	private _chrono: Chrono;

	constructor() {
		this._chrono = casual.clone();
		this._chrono.refiners.push({
			refine: (context, results) => {
				// If there is no AM/PM (meridiem) specified
				results.forEach((result) => {
					if (!result.start.isCertain('meridiem') &&
						result.start.get('hour') >= 1 && result.start.get('hour') <= 12) {
						result.start.assign('meridiem', 1);
						result.start.assign('hour', result.start.get('hour') + 12);
					}
					if (!result.end.isCertain('meridiem') &&
						result.end.get('hour') >= 1 && result.end.get('hour') <= 12) {
						result.end.assign('meridiem', 1);
						result.end.assign('hour', result.end.get('hour') + 12);
					}
				});
				return results;
			}
		});
	}

	parse(text: string){
		return this._chrono.parse(text);
	}


	getDates(parsed: ParsedResult[]): {start?: Date, end?: Date} {
		if (parsed.length == 1){
			const start = parsed[0].start == null ? null : parsed[0].start.date();
			const end = parsed[0].end == null ? null : parsed[0].end.date();
			return {start, end};
		}
		let startYear, startMonth, startDay, startHour, startMin;
		startYear = [];
		startMonth = [];
		startDay = [];
		startHour = [];
		startMin = [];

		let endYear, endMonth, endDay, endHour, endMin;
		endYear = [];
		endMonth = [];
		endDay = [];
		endHour = [];
		endMin = [];

		// Pushing either null or a value
		parsed.forEach(p => {
			if(p.start != undefined){
				startYear.push(this.getOnlyIfCertain(p.start, 'year'));
				startMonth.push(this.getOnlyIfCertain(p.start, 'month'));
				startDay.push(this.getOnlyIfCertain(p.start, 'day'));
				startHour.push(this.getOnlyIfCertain(p.start, 'hour'));
				startMin.push(this.getOnlyIfCertain(p.start, 'minute'));
			}
			if (p.end != undefined){
				endYear.push(this.getOnlyIfCertain(p.end, 'year'));
				endMonth.push(this.getOnlyIfCertain(p.end, 'month'));
				startDay.push(this.getOnlyIfCertain(p.end, 'day'));
				endHour.push(this.getOnlyIfCertain(p.end, 'hour'));
				endMin.push(this.getOnlyIfCertain(p.end, 'minute'));
			}
		})

		// Cleaning the nulls
		const components = [startYear, startMonth, startDay, startHour, startMin, endYear, endMonth, endDay, endHour, endMin];
		components.forEach((c, i) => components[i] = c.filter(value => value != null));

		const now = new Date();

		const start = new Date(
			startYear[0] ?? parsed[0].start.get("year"),
			startMonth[0] ?? now.getMonth(),
			startDay[0] ?? now.getDate(),
			startHour ?? 0,
			startMin ?? 0,
		);

		const end = new Date(
			endYear[0] ?? parsed[0].start.get("year"),
			endMonth[0] ?? now.getMonth(),
			endDay[0] ?? now.getDate(),
			endHour[0] ?? 0,
			endMin[0] ?? 0,
		);

		return {start, end};
	}

	getOnlyIfCertain(parsedComponent: ParsedComponents, component: Component){
		if (parsedComponent.isCertain(component))
			return parsedComponent.get(component);
		return null;
	}
}

const smartDateParser = new SmartDateParser();
export default smartDateParser;
