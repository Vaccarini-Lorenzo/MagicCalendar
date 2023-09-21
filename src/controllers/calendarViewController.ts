import eventController from "./eventController";
import {DateRange} from "../model/dateRange";
import {CalendarView} from "../plugin/calendarView";
import {CloudEvent} from "../model/events/cloudEvent";
import {MarkdownView} from "obsidian";
import {CalendarViewData} from "../model/calendarViewData";
import {Misc} from "../misc/misc";

class CalendarViewController {
	cloudEventUUIDMap: Map<string, CloudEvent> = new Map<string, CloudEvent>();

	async getMarkdownPostProcessor(element, context){
		const codeblocks = element.querySelectorAll("code");
		const codeComponents = calendarViewController.processCodeBlocks(codeblocks);
		calendarViewController.removeOldNodes(element);
		if (codeComponents.length == 0) return null;
		for (let i=0; i<codeComponents.length; i++){
			const codeComponent = codeComponents[i];
			const eventList = await calendarViewController.getEventList(codeComponent);
			eventList.forEach((cloudEvent) => calendarViewController.cloudEventUUIDMap.set(cloudEvent.cloudEventUUID, cloudEvent));
			const calendarViewData = new CalendarViewData(new DateRange(new Date(codeComponent.from), new Date(codeComponent.to)), eventList);
			if (!codeComponent.codeBlock) return null;
			const calendarView = new CalendarView(codeComponent.codeBlock, calendarViewData, calendarViewController.dropCallback);
			context.addChild(calendarView);
		}
	}

	dropCallback(cloudEventUUID: string, updateMap: Map<string, string>){
		const cloudEvent = calendarViewController.cloudEventUUIDMap.get(cloudEventUUID) as CloudEvent;
		eventController.updateCloudEvent(cloudEvent, updateMap);
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

	async postProcessorUpdate() {
		const markdownLeaves = app.workspace.getLeavesOfType("markdown")
			.filter(leaf => (leaf.view as MarkdownView).previewMode.renderer.sections
				.filter(s => s.el.querySelector('table.icalTable')));
		if (markdownLeaves.length == 0) return;
		const leaf = markdownLeaves[0];
		const view = <MarkdownView>leaf.view;
		const sections = view.previewMode.renderer.sections.filter(s => s.el.querySelector('table.icalTable'));
		if (sections.length == 0) return;
		sections[0].rendered = false;
		view.previewMode.renderer.queueRender();
	}

	private removeOldNodes(element) {
		const oldNodes = Array.from(element.querySelectorAll('p').values()).filter(p => (p as HTMLElement).querySelectorAll("table.icalTable").length > 0) as HTMLElement[];
		oldNodes.forEach(oldNode => oldNode.parentNode.removeChild(oldNode));
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
}

const calendarViewController = new CalendarViewController();
export default calendarViewController;
