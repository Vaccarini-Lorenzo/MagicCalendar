import eventController from "./eventController";
import {DateRange} from "../model/dateRange";
import {iCloudCalendarEvent} from "../iCloudJs/calendar";
import {CalendarViewDetail} from "../model/calendarViewDetail";
import {CalendarView} from "../plugin/calendarView";
import {Misc} from "../misc/misc";

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

	private getCalendarViewData(dateRange: DateRange, eventList: iCloudCalendarEvent[] | []): {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate} {
		const calendarViewDetails: CalendarViewDetail[] = [];
		const noOverlapMap = this.manageEventOverlap(eventList, dateRange);
		const auxStruct = this.getAuxiliaryStructure(dateRange);
		const rowNeedsLabelMap = new Map<number, boolean>();
		const filledRows = this.fillCalendarViewDetails(noOverlapMap, rowNeedsLabelMap, auxStruct, calendarViewDetails);

		return {
			numOfCols: auxStruct.numOfCols,
			numOfRows: filledRows,
			rowNeedsLabelMap,
			calendarViewDetails,
			startDate: dateRange.start
		}
	}

	private getAuxiliaryStructure(dateRange: DateRange) : {numOfCols, refiner, refinerMinutes, minTimeMilli, milliInDay} {
		const numOfConsideredHours = 24;
		// Every 15 mins
		const refiner = 2;
		const refinerMinutes = 60 / refiner;
		const numOfCols = numOfConsideredHours * refiner;

		const minTimeMilli = dateRange.start.getTime();
		const milliInDay = 1000 * 3600 * 24;

		return {
			numOfCols,
			refiner,
			refinerMinutes,
			minTimeMilli,
			milliInDay
		}
	}

	private manageEventOverlap(eventList: iCloudCalendarEvent[] | [], dateRange: DateRange) {
		const date = new Date(dateRange.start);
		const dayDiff = dateRange.getDayDifference();

		const noOverlapMap = new Map<Date, iCloudCalendarEvent[][]>();
		for (let i = 0; i <= dayDiff; i++){
			const dayEvents = this.filterEventsWithStartDate(eventList, date);
			this.checkOverlaps(dayEvents, noOverlapMap, date);
			date.setDate(date.getDate() + 1);
		}
		return noOverlapMap;
	}

	private filterEventsWithStartDate(eventList: iCloudCalendarEvent[], date: Date): iCloudCalendarEvent[] {
		return eventList.filter(event => {
			const eventDate = Misc.getDateFromICloudArray(event.startDate);
			return eventDate.toLocaleDateString() == date.toLocaleDateString();
		})
	}

	private checkOverlaps(dayEvents: iCloudCalendarEvent[], noOverlapMap, date: Date){
		const sortedDayEvents = Misc.sortICloudCalendarEventList(dayEvents);
		const toCheckList = [...sortedDayEvents];
		const eventRows = [];

		sortedDayEvents.forEach((dayEvent, dayEventsIndex) => {
			//console.log(`[${dayEvent.title}] looking for overlap`);
			if (!toCheckList.contains(dayEvent)) return;
			toCheckList.remove(dayEvent);
			const noOverlapList: iCloudCalendarEvent[] = [dayEvent];
			//noOverlapMap.set(dayEvent, null);
			const dateRange = new DateRange(Misc.getDateFromICloudArray(dayEvent.startDate), Misc.getDateFromICloudArray(dayEvent.endDate));
			for (let i = dayEventsIndex + 1; i < sortedDayEvents.length; i++){
				const nextEvent = sortedDayEvents[i];
				const nextDateRange = new DateRange(Misc.getDateFromICloudArray(nextEvent.startDate), Misc.getDateFromICloudArray(nextEvent.endDate));
				//console.log(`[${dayEvent.title}] overlaps?  `, dateRange.overlaps(nextDateRange));
				if (dateRange.overlaps(nextDateRange)) continue;
				toCheckList.remove(nextEvent);
				noOverlapList.push(nextEvent);
			}
			//console.log(`[${dayEvent.title}] TMP OverlapList `, noOverlapList);
			this.propagateListOverlapCheck(noOverlapList, toCheckList);
			eventRows.push(noOverlapList);
			//console.log(`[${dayEvent.title}] NoOverlapList `, noOverlapList);
		})
		noOverlapMap.set(new Date(date), eventRows);
	}

	private propagateListOverlapCheck(noOverlapList: iCloudCalendarEvent[], toCheckList: iCloudCalendarEvent[]) {

		noOverlapList.forEach((noOverlapEvent, noOverlapIndex) => {
			const noOverlapEventDateRange = new DateRange(Misc.getDateFromICloudArray(noOverlapEvent.startDate), Misc.getDateFromICloudArray(noOverlapEvent.endDate));
			for (let i = noOverlapIndex + 1; i < noOverlapList.length; i++){
				const check = noOverlapList[i];
				const checkDateRange = new DateRange(Misc.getDateFromICloudArray(check.startDate), Misc.getDateFromICloudArray(check.endDate));
				if (noOverlapEventDateRange.overlaps(checkDateRange)){
					noOverlapList.remove(check);
					toCheckList.push(check);
				}
			}
		})
	}

	private fillCalendarViewDetails(noOverlapMap, rowNeedsLabelMap, auxStruct, calendarViewDetails): number {
		let rowIndex = 0;

		Array.from(noOverlapMap.entries()).forEach((noOverlapEntry) => {
			const eventBlocks = noOverlapEntry[1];
			if (eventBlocks.length == 0){
				rowNeedsLabelMap.set(rowIndex, true);
				rowIndex += 1;
				return;
			}
			let isOverlap = false;
			eventBlocks.forEach(noOverlapArray => {
				noOverlapArray.forEach(noOverlapEvent => {
					if (isOverlap){
						rowNeedsLabelMap.set(rowIndex, false);
					} else {
						rowNeedsLabelMap.set(rowIndex, true);
					}
					const eventStartTime = Misc.getDateFromICloudArray(noOverlapEvent.startDate)
					const eventEndTime = Misc.getDateFromICloudArray(noOverlapEvent.endDate)
					const fromCol = eventStartTime.getHours() * auxStruct.refiner + eventStartTime.getMinutes() / auxStruct.refinerMinutes
					const toCol = eventEndTime.getHours() * auxStruct.refiner + eventEndTime.getMinutes() / auxStruct.refinerMinutes
					const row = rowIndex;
					const title = noOverlapEvent.title;
					const calendarViewDetail = new CalendarViewDetail(title, row, fromCol, toCol)
					calendarViewDetails.push(calendarViewDetail);
				})
				isOverlap = true;
				rowIndex += 1;
			})
		})

		return rowIndex;
	}
}

const calendarViewController = new CalendarViewController();
export default calendarViewController;
