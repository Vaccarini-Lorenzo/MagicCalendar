import eventController from "./eventController";
import {DateRange} from "../model/dateRange";
import {CalendarViewDetail} from "../model/calendarViewDetail";
import {CalendarView} from "../plugin/calendarView";
import {Misc} from "../misc/misc";
import {CloudEvent} from "../model/events/cloudEvent";
import {MarkdownView} from "obsidian";

class CalendarViewController {
	async getMarkdownPostProcessor(element, context){
		const codeblocks = element.querySelectorAll("code");
		const codeComponents = calendarViewController.processCodeBlocks(codeblocks);
		if (codeComponents.length == 0) return null;
		for (let i=0; i<codeComponents.length; i++){
			const codeComponent = codeComponents[i];
			const eventList = await calendarViewController.getEventList(codeComponent);
			const calendarViewData = calendarViewController.getCalendarViewData(new DateRange(new Date(codeComponent.from), new Date(codeComponent.to)), eventList);
			context.addChild(new CalendarView(codeComponent.codeBlock, calendarViewData));
		}
	}

	processCodeBlocks(codeBlocks): {codeBlock, from, to}[] {
		const codeComponents = [];
		if (codeBlocks.length == 0) return codeComponents;
		codeBlocks.forEach(codeBlock => {
			const codeText = codeBlock.innerText.replaceAll(" ", "");
			const isCal = codeText.substring(0, 6) == "<ical>";
			if (!isCal) return null;
			let from = calendarViewController.matchRegex("from:", codeText);
			if(from == undefined) return null;
			from = from.replaceAll("from:", "");
			let to = calendarViewController.matchRegex("to:", codeText);
			if(to == undefined) to = from;
			else to = to.replaceAll("to:", "");
			codeComponents.push({codeBlock, from, to})
		})

		return codeComponents;
	}

	postProcessorUpdate() {
		for (const leaf of app.workspace.getLeavesOfType("markdown")) {
			const view = <MarkdownView>leaf.view;
			console.log(view);
			for (const section of view.previewMode.renderer.sections.filter(s => s.el.querySelector('.icalTable'))) {
				// This code flags the section containing your element as an element that has to be rerendered
				section.rendered = false;
				section.html = '';
			}
			// Rerender all flagged elements
			view.previewMode.renderer.queueRender();
		}
	}

	private matchRegex(prefix, text): string | undefined{
		// Constructing the regular expression pattern
		const pattern = `${prefix}\\d{4}(\\/|-)\\d{1,2}(\\/|-)\\d{1,2}`;
		const matches = text.replaceAll(" ", "").match(pattern);
		if (matches == null) return undefined;
		return matches.filter(match => match.length > 4).first();
	}

	private async getEventList(codeComponents: { from; to }): Promise<CloudEvent[] | []> {
		const dateRange = new DateRange(new Date(codeComponents.from), new Date(codeComponents.to));
		return await eventController.getEventsFromRange(dateRange);
	}

	private getCalendarViewData(dateRange: DateRange, eventList: CloudEvent[] | []): {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate} {
		const calendarViewDetails: CalendarViewDetail[] = [];
		console.log(eventList);
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
			console.log("iteration: ", dayEventsIndex);
			toCheckList.forEach(a => console.log(a.cloudEventTitle));
			toCheckList.remove(dayEvent);
			const noOverlapList: CloudEvent[] = [dayEvent];
			const dateRange = new DateRange(dayEvent.cloudEventStartDate, dayEvent.cloudEventEndDate);
			for (let i = dayEventsIndex + 1; i < sortedDayEvents.length; i++){
				const nextEvent = sortedDayEvents[i];
				if (!toCheckList.contains(nextEvent)) continue;
				const nextDateRange = new DateRange(nextEvent.cloudEventStartDate, nextEvent.cloudEventEndDate);
				if (dateRange.overlaps(nextDateRange)) continue;
				toCheckList.remove(nextEvent);
				console.log("removing", nextEvent.cloudEventTitle, "from toCheckList")
				noOverlapList.push(nextEvent);
			}
			this.propagateListOverlapCheck(noOverlapList, toCheckList);
			eventRows.push(noOverlapList);
		})
		noOverlapMap.set(new Date(date), eventRows);
		console.log(Array.from(noOverlapMap.entries()));
	}

	private propagateListOverlapCheck(noOverlapList: CloudEvent[], toCheckList: CloudEvent[]) {
		console.log("propagating overlap check")
		noOverlapList.forEach((noOverlapEvent, noOverlapIndex) => {
			const noOverlapEventDateRange = new DateRange(noOverlapEvent.cloudEventStartDate, noOverlapEvent.cloudEventEndDate);
			for (let i = noOverlapIndex + 1; i < noOverlapList.length; i++){
				const check = noOverlapList[i];
				const checkDateRange = new DateRange(check.cloudEventStartDate, check.cloudEventEndDate);
				console.log("checking overlap:", noOverlapEvent.cloudEventTitle, check.cloudEventTitle);
				if (noOverlapEventDateRange.overlaps(checkDateRange)){
					console.log("OVERLAP!")
					noOverlapList.remove(check);
					toCheckList.push(check);
					console.log("ADDING", check.cloudEventTitle, "to toCheckList")
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

const calendarViewController = new CalendarViewController();
export default calendarViewController;
