import smartDateParser from "./smartDateParser";
import eventController from "./eventController";

class CalendarViewController {
	getMarkdownPostProcessor(element, context){
		const codeblocks = element.querySelectorAll("code");
		for (let index = 0; index < codeblocks.length; index++) {
			const codeblock = codeblocks.item(index);
			const codeText = codeblock.innerText.trim();
			const isCal = codeText.substring(0, 6) == "<ical>";
			if (!isCal) return;
			const from = calendarViewController.matchRegex("from:", codeText);
			if(from == undefined) return;
			let to = calendarViewController.matchRegex("to:", codeText);
			if(to == undefined) to = from.replaceAll("from:", "to:");
			const rangeString = `${from} ${to}`.replaceAll(":" , " ");
			const dateRange = smartDateParser.getDates(smartDateParser.parse(rangeString));
			const eventList = eventController.getEventFromRange(dateRange);
		}
	}

	private matchRegex(prefix, text): string | undefined{
		// Constructing the regular expression pattern
		const pattern = `${prefix}\\d{4}(\\/|-)\\d{1,2}(\\/|-)\\d{1,2}`;
		const matches = text.replaceAll(" ", "").match(pattern);
		if (matches == null) return undefined;
		return matches.filter(match => match.length > 4).first();
	}
}

const calendarViewController = new CalendarViewController();
export default calendarViewController;
