import {casual, Chrono, Component, ParsedResult} from "chrono-node";
import {ParsedComponents} from "chrono-node/dist/cjs/types";
import {DateRange} from "../model/dateRange";

class SmartDateParser {
	private _chrono: Chrono;

	constructor() {
		this._chrono = casual.clone();
		this._chrono.parsers.push({
			pattern: () => { return /\d{1,2}(st|nd|rd|th)/},
			extract: (context, match) => {
				let parsedDay = match[0].replaceAll("st", "");
				parsedDay = parsedDay.replaceAll("nd", "");
				parsedDay = parsedDay.replaceAll("rd", "");
				parsedDay = parsedDay.replaceAll("th", "");
				return {
					day: Number(parsedDay),
					hour: 0
				}
			}
		})
	}

	parse(text: string){
		return this._chrono.parse(text);
	}


	getDates(parsed: ParsedResult[]): DateRange {
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
				startMonth.push(this.getOnlyIfCertain(p.start, 'month'));
				startDay.push(this.getOnlyIfCertain(p.start, 'day'));
				startHour.push(this.getOnlyIfCertain(p.start, 'hour'));
				startMin.push(this.getOnlyIfCertain(p.start, 'minute'));
			}
			if (p.end != undefined){
				endYear.push(this.getOnlyIfCertain(p.end, 'year'));
				endMonth.push(this.getOnlyIfCertain(p.end, 'month'));
				endDay.push(this.getOnlyIfCertain(p.end, 'day'));
				endHour.push(this.getOnlyIfCertain(p.end, 'hour'));
				endMin.push(this.getOnlyIfCertain(p.end, 'minute'));
			}
		})

		// Cleaning the nulls
		const components = [startYear, startMonth, startDay, startHour, startMin, endYear, endMonth, endDay, endHour, endMin];
		components.forEach((c, i) => components[i] = c.filter(value => value != null));

		const firstValidStartParser = parsed.filter(p => p.start != undefined)[0];

		const start = new Date(
			components[0].length == 0 ? firstValidStartParser.start.get("year") : components[0][0],
			components[1].length == 0 ? firstValidStartParser.start.get("month") : components[1][0],
			components[2].length == 0 ? firstValidStartParser.start.get("day") : components[2][0],
			components[3].length == 0 ? 0 : components[3][0],
			components[4].length == 0 ? 0 : components[4][0],
		);

		const end = new Date(
			components[5].length == 0 ? start.getFullYear(): components[5][0],
			components[6].length == 0 ? start.getMonth(): components[6][0],
			components[7].length == 0 ? start.getDate(): components[7][0],
			components[8].length == 0 ? start.getHours(): components[8][0],
			components[9].length == 0 ? start.getMinutes(): components[9][0],
		);

		return new DateRange(start, end);
	}

	getOnlyIfCertain(parsedComponent: ParsedComponents, component: Component){
		if (parsedComponent.isCertain(component))
			return parsedComponent.get(component);
		return null;
	}
}

const smartDateParser = new SmartDateParser();
export default smartDateParser;
