import {casual, Chrono, Component, ParsedResult} from "chrono-node";
import {ParsedComponents} from "chrono-node/dist/cjs/types";

class SmartDateParser {
	private _chrono: Chrono;

	constructor() {

		//TODO: Chrono doesn't parse correctly 10th of this month: implement refiner
		//TODO: On saturday but saturday has already passed by -> last saturday
		this._chrono = casual.clone();
	}

	parse(text: string){
		console.log(text);
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

		if (parsed.length  == 0) return;

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

		console.log(components);

		// TODO: Double check this logic
		const firstValidStartParser = parsed.filter(p => p.start != undefined)[0];

		const start = new Date(
			startYear[0] ?? firstValidStartParser.start.get("year"),
			startMonth[0] ?? (firstValidStartParser.start.get("month") - 1),
			startDay[0] ?? firstValidStartParser.start.get("day"),
			startHour ?? 0,
			startMin ?? 0,
		);

		const end = new Date(
			endYear[0] ??  firstValidStartParser.start.get("year"),
			endMonth[0] ?? (firstValidStartParser.start.get("month") - 1),
			endDay[0] ?? firstValidStartParser.start.get("day"),
			endHour[0] ?? start.getHours(),
			endMin[0] ?? start.getMinutes(),
		);

		return {start, end};
	}

	getOnlyIfCertain(parsedComponent: ParsedComponents, component: Component){
		if(component == "day"){
			console.log("certain " + parsedComponent.isCertain(component));
			console.log(parsedComponent.get(component));
		}

		if (parsedComponent.isCertain(component))
			return parsedComponent.get(component);
		return null;
	}
}

const smartDateParser = new SmartDateParser();
export default smartDateParser;
