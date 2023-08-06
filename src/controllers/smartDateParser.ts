import {casual, Chrono, Component, ParsedResult} from "chrono-node";
import {ParsedComponents} from "chrono-node/dist/cjs/types";

class SmartDateParser {
	private _chrono: Chrono;

	constructor() {
		this._chrono = casual.clone();
	}

	parse(text: string){
		return this._chrono.parse(text);
	}


	getDates(parsed: ParsedResult[]): {start?: Date, end?: Date} {
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
				startMonth.push(this.getOnlyIfCertain(p.start, 'month') == null ? null : this.getOnlyIfCertain(p.start, 'month') - 1);
				startDay.push(this.getOnlyIfCertain(p.start, 'day'));
				startHour.push(this.getOnlyIfCertain(p.start, 'hour'));
				startMin.push(this.getOnlyIfCertain(p.start, 'minute'));
			}
			if (p.end != undefined){
				endYear.push(this.getOnlyIfCertain(p.end, 'year'));
				endMonth.push(this.getOnlyIfCertain(p.end, 'month') == null ? null : this.getOnlyIfCertain(p.end, 'month') - 1);
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
			startYear[0] ?? now.getFullYear(),
			startMonth[0] ?? now.getMonth(),
			startDay[0] ?? now.getDate(),
			startHour ?? 0,
			startMin ?? 0,
		);

		const end = new Date(
			endYear[0] ??  now.getFullYear(),
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
