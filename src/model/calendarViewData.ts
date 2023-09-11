import {CalendarViewDetail} from "./calendarViewDetail";
import {DateRange} from "./dateRange";
import {CloudEvent} from "./events/cloudEvent";
import {Misc} from "../misc/misc";

export class CalendarViewData {
	numOfCols: number;
	numOfRows: number;
	rowNeedsLabelMap: Map<number, boolean>;
	calendarViewDetails: CalendarViewDetail[];
	startDate: Date;

	constructor(dateRange: DateRange, eventList: CloudEvent[] | []) {
		const calendarViewDetails: CalendarViewDetail[] = [];
		const noOverlapMap = this.manageEventOverlap(eventList, dateRange);
		const auxStruct = this.getAuxiliaryStructure(dateRange);
		const rowNeedsLabelMap = new Map<number, boolean>();
		const filledRows = this.fillCalendarViewDetails(noOverlapMap, rowNeedsLabelMap, auxStruct, calendarViewDetails);
		this.numOfCols = auxStruct.numOfCols;
		this.numOfRows = filledRows;
		this.rowNeedsLabelMap = rowNeedsLabelMap;
		this.calendarViewDetails = calendarViewDetails;
		this.startDate = dateRange.start;
	}

	private getAuxiliaryStructure(dateRange: DateRange) : {numOfCols, refiner, refinerMinutes, minTimeMilli, milliInDay} {
		const numOfConsideredHours = 24;
		// Every 30 mins
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

	private manageEventOverlap(eventList: CloudEvent[] | [], dateRange: DateRange) {
		const date = new Date(dateRange.start);
		const dayDiff = dateRange.getDayDifference();

		const noOverlapMap = new Map<Date, CloudEvent[][]>();
		for (let i = 0; i <= dayDiff; i++){
			const dayEvents = this.filterEventsWithStartDate(eventList, date);
			this.checkOverlaps(dayEvents, noOverlapMap, date);
			date.setDate(date.getDate() + 1);
		}
		return noOverlapMap;
	}

	private filterEventsWithStartDate(eventList: CloudEvent[], date: Date): CloudEvent[] {
		return eventList.filter(event => {
			const eventDate = event.cloudEventStartDate;
			return eventDate.toLocaleDateString() == date.toLocaleDateString();
		})
	}

	private checkOverlaps(dayEvents: CloudEvent[], noOverlapMap, date: Date){
		const sortedDayEvents = Misc.sortCloudEventList(dayEvents);
		const toCheckList = [...sortedDayEvents];
		const eventRows = [];

		sortedDayEvents.forEach((dayEvent, dayEventsIndex) => {
			if (!toCheckList.contains(dayEvent)) return;
			toCheckList.remove(dayEvent);
			const noOverlapList: CloudEvent[] = [dayEvent];
			const dateRange = new DateRange(dayEvent.cloudEventStartDate, dayEvent.cloudEventEndDate);
			for (let i = dayEventsIndex + 1; i < sortedDayEvents.length; i++){
				const nextEvent = sortedDayEvents[i];
				if (!toCheckList.contains(nextEvent)) continue;
				const nextDateRange = new DateRange(nextEvent.cloudEventStartDate, nextEvent.cloudEventEndDate);
				if (dateRange.overlaps(nextDateRange)) continue;
				toCheckList.remove(nextEvent);
				noOverlapList.push(nextEvent);
			}
			this.propagateListOverlapCheck(noOverlapList, toCheckList);
			eventRows.push(noOverlapList);
		})
		noOverlapMap.set(new Date(date), eventRows);
	}

	private propagateListOverlapCheck(noOverlapList: CloudEvent[], toCheckList: CloudEvent[]) {
		noOverlapList.forEach((noOverlapEvent, noOverlapIndex) => {
			const noOverlapEventDateRange = new DateRange(noOverlapEvent.cloudEventStartDate, noOverlapEvent.cloudEventEndDate);
			for (let i = noOverlapIndex + 1; i < noOverlapList.length; i++){
				const check = noOverlapList[i];
				const checkDateRange = new DateRange(check.cloudEventStartDate, check.cloudEventEndDate);
				if (noOverlapEventDateRange.overlaps(checkDateRange)){
					noOverlapList.remove(check);
					toCheckList.push(check);
					// The list size has reduced
					i--;
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
					const eventStartTime = noOverlapEvent.cloudEventStartDate;
					const eventEndTime = noOverlapEvent.cloudEventEndDate;
					const fromCol = eventStartTime.getHours() * auxStruct.refiner + eventStartTime.getMinutes() / auxStruct.refinerMinutes
					const toCol = eventEndTime.getHours() * auxStruct.refiner + eventEndTime.getMinutes() / auxStruct.refinerMinutes
					const row = rowIndex;
					const title = noOverlapEvent.cloudEventTitle;
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
