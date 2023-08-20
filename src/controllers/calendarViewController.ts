import eventController from "./eventController";
import {DateRange} from "../model/dateRange";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {CalendarViewDetail} from "../model/calendarViewDetail";
import {CalendarView} from "../plugin/calendarView";

class CalendarViewController {
	async getMarkdownPostProcessor(element, context){
		const codeblocks = element.querySelectorAll("code");
		const codeComponents = calendarViewController.checkCodeBlocks(codeblocks);
		if (codeComponents == null) return;
		const eventList = await calendarViewController.getEventList(codeComponents);
		const calendarViewData = calendarViewController.getCalendarViewData( new DateRange(new Date(codeComponents.from), new Date(codeComponents.to)), eventList);
		context.addChild(new CalendarView(codeComponents.codeBlock, calendarViewData));
	}

	checkCodeBlocks(codeBlocks): {codeBlock, from, to} | null {
		if (codeBlocks.length == 0) return null;
		const codeBlock = codeBlocks.item(0);
		const codeText = codeBlock.innerText.replaceAll(" ", "");
		const isCal = codeText.substring(0, 6) == "<ical>";
		if (!isCal) return null;
		let from = calendarViewController.matchRegex("from:", codeText);
		if(from == undefined) return null;
		from = from.replaceAll("from:", "");
		let to = calendarViewController.matchRegex("to:", codeText);
		if(to == undefined) to = from;
		else to = to.replaceAll("to:", "");
		return {codeBlock, from, to};
	}

	private matchRegex(prefix, text): string | undefined{
		// Constructing the regular expression pattern
		const pattern = `${prefix}\\d{4}(\\/|-)\\d{1,2}(\\/|-)\\d{1,2}`;
		const matches = text.replaceAll(" ", "").match(pattern);
		if (matches == null) return undefined;
		return matches.filter(match => match.length > 4).first();
	}

	private async getEventList(codeComponents: { from; to }): Promise<iCloudCalendarEvent[] | []> {
		const dateRange = new DateRange(new Date(codeComponents.from), new Date(codeComponents.to));
		return await eventController.getEventsFromRange(dateRange);
	}

	private getCalendarViewData(dateRange: DateRange, eventList: iCloudCalendarEvent[] | []): {numOfCols, numOfRows, calendarViewDetails, startDate} {
		const calendarViewDetails: CalendarViewDetail[] = [];
		const numOfConsideredHours = 24;
		// Every 15 mins
		const refiner = 2;
		const refinerMinutes = 60 / refiner;
		const numOfCols = numOfConsideredHours * refiner;
		const maxTimeMilli = dateRange.end.getTime();
		const minTimeMilli = dateRange.start.getTime();
		const maxDateDelta =  maxTimeMilli - minTimeMilli;
		const milliInDay = 1000 * 3600 * 24;
		const numOfRows = Math.floor(maxDateDelta / milliInDay);
		eventList.forEach(event => {
			const eventStartTime = eventController.getEventDate(event.startDate)
			const eventEndTime = eventController.getEventDate(event.endDate)
			const fromCol = eventStartTime.getHours() * refiner + eventStartTime.getMinutes() / refinerMinutes
			const toCol = eventEndTime.getHours() * refiner + eventEndTime.getMinutes() / refinerMinutes
			const dateDelta = eventStartTime.getTime() - minTimeMilli;
			const row = Math.floor(dateDelta / milliInDay);
			const title = event.title;
			const calendarViewDetail = new CalendarViewDetail(title, row, fromCol, toCol)
			calendarViewDetails.push(calendarViewDetail);
		})
		return {
			numOfCols,
			numOfRows,
			calendarViewDetails,
			startDate: dateRange.start
		}
	}
}

const calendarViewController = new CalendarViewController();
export default calendarViewController;
