import {casual, Chrono, ParsedResult} from "chrono-node";

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
		let startYear = undefined;
		let startMonth = undefined;
		let startDay = undefined;
		let startHour = undefined;
		let startMin = undefined;

		let endYear = undefined;
		let endMonth = undefined;
		let endDay = undefined;
		let endHour = undefined;
		let endMin = undefined;

		parsed.forEach(p => {
			if(p.start != undefined){
				if(startDay == undefined) startDay = p.start.get('day');
				if(startMonth == undefined) startMonth = p.start.get('month');
				if(startYear == undefined) startYear = p.start.get('year');
				if(startHour == undefined) startHour = p.start.get('hour');
				if(startMin == undefined) startMin = p.start.get('minute');
			}
			if (p.end != undefined){
				if(endDay == undefined) endDay = p.end.get('day');
				if(endMonth == undefined) endMonth = p.end.get('month');
				if(endYear == undefined) endYear = p.end.get('year');
				if(endHour == undefined) endHour = p.end.get('hour');
				if(endMin == undefined) endMin = p.end.get('minute');
			}

		})

		const now = new Date();

		const start = new Date(
			startYear ?? now.getFullYear(),
			startMonth ?? now.getMonth(),
			startDay ?? now.getDate(),
			startHour ?? 6,
			startMin ?? 0,
		);

		const end = new Date(
			endYear ?? now.getFullYear(),
			endMonth ?? now.getMonth(),
			endDay ?? now.getDate(),
			endHour ?? 23,
			endMin ?? 0,
		);

		return {start, end};
	}
}

const smartDateParser = new SmartDateParser();
export default smartDateParser;
