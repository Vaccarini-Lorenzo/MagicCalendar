import { RangeSetBuilder } from "@codemirror/state";
import nplController from "../controllers/nlpController";
import { HighlightWidget } from "./highlightWidget";
import { Decoration, DecorationSet, EditorView, PluginSpec, PluginValue, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { UnderlineWidget } from "./underLineWidget";
import { Sentence } from "../model/sentence";
import eventController from "../controllers/eventController";
import Event from "../model/event";
import { Misc } from "../misc/misc";
import iCloudController from "../controllers/iCloudController";
import { Notice } from "obsidian";
import nlpController from "../controllers/nlpController";

class NLPPlugin implements PluginValue {
	decorations: DecorationSet;
	// For animation purposes
	widgetFirstLoad: boolean;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
		this.widgetFirstLoad = true;
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	buildDecorations(view: EditorView): DecorationSet {
		const filePath = Misc.getCurrentFilePath();
		const builder = new RangeSetBuilder<Decoration>();
		const documentLines = view.state.doc.slice(view.viewport.from, view.viewport.to).toJSON();
		documentLines.some((line, i) => {
			const matches = nplController.process(new Sentence(filePath, line));
			nlpController.test(new Sentence(filePath, line));
			//const matches = null;
			if(matches == null) return false;
			const eventDetailString = this.getEventDetail(matches.event);
			matches.selection.forEach(match => {
				const matchMetadata = this.getMatchTextMetadata(documentLines, view.viewport.from, i, line, match);
				if(matchMetadata == null) return;
				const widget = this.getWidget(matches.selection, match, matchMetadata, (sync) => {
					if (!iCloudController.isLoggedIn()){
						new Notice("You're not logged in! 🥲\nLook for iCalSync in the command palette to log in")
						return;
					}
					eventController.processEvent(filePath, sync);
					this.widgetFirstLoad = true;
					view.setState(view.state);
				}, eventDetailString);

				setTimeout((ref) => {
					if (ref.widgetFirstLoad) ref.widgetFirstLoad = false;
				}, 500, this);

				try{
					builder.add(
						matchMetadata.startsFrom,
						matchMetadata.endsTo,
						Decoration.replace({
							widget,
						})
					);
				} catch (e){
					// Nothing to see here
				}
			});
			return true;
		})
		nlpController.print()
		return builder.finish();
	}

	destroy() {
		// ...
	}

	private getMatchTextMetadata(documentLines: string[], viewPortFrom: number, currentIndex: number, line: string, match: {value, index, type}): {startsFrom, endsTo, capitalizedMatch} | null {
		let previousChars = viewPortFrom;
		for (let j=0; j < currentIndex; j++){
			previousChars += documentLines[j].length + 1;
		}
		const indexOfMatch = line.toLowerCase().indexOf(match.value);
		if(indexOfMatch == -1) return null;
		const capitalizedMatch = line.substring(indexOfMatch, indexOfMatch + match.value.length)
		const startsFrom = previousChars + indexOfMatch;
		const endsTo = startsFrom + match.value.length;
		return {
			startsFrom,
			endsTo,
			capitalizedMatch
		}
	}


	private getWidget(matches: {value, index, type}[], match: {value, index, type}, matchMetadata: { startsFrom; endsTo; capitalizedMatch }, highlightWidgetCallback: (sync: boolean) => void, eventDetailString): WidgetType {
		let widget: WidgetType = new UnderlineWidget(matchMetadata.capitalizedMatch, this.widgetFirstLoad);
		//let widget: WidgetType = new HighlightWidget(matchMetadata.capitalizedMatch, eventDetailString, highlightWidgetCallback , this.widgetFirstLoad);
		const isExplicitDatePresent = matches.filter(match => match.type == "date" || match.type == "ordinalDate" || match.type == "ordinalDateReverse").length > 0;
		// If there is no explicit date, highlight the exactTime/timeRange
		// e.g.: At 2 o'clock I'll join a meeting  <-  2 o'clock should be highlighted
		if(isExplicitDatePresent &&  (match.type == "date" || match.type == "ordinalDate" || match.type == "ordinalDateReverse")){
			widget = new HighlightWidget(matchMetadata.capitalizedMatch, eventDetailString, highlightWidgetCallback , this.widgetFirstLoad);
		} else if (!isExplicitDatePresent && (match.type == "timeRange" || match.type == "exactTime")){
			widget = new HighlightWidget(matchMetadata.capitalizedMatch, eventDetailString, highlightWidgetCallback , this.widgetFirstLoad);
		}
		return widget;
	}

	private getEventDetail(event: Event): {title, dateString, timeString, hasTimeDetails} {
		const title = event.value.title;
		const startDate = event.value.startDate;
		const endDate = event.value.endDate;

		// startDate, exactly like endDate is an array as the following [yearMonthDay, year, month, day, hour, min ...]
		const startDateString = `${startDate[1]}/${Misc.fromSingleToDoubleDigit(startDate[2])}/${Misc.fromSingleToDoubleDigit(startDate[3])}`
		const endDateString = `${endDate[1]}/${Misc.fromSingleToDoubleDigit(endDate[2])}/${Misc.fromSingleToDoubleDigit(endDate[3])}`;
		const startTimeString = `${Misc.fromSingleToDoubleDigit(startDate[4])}:${Misc.fromSingleToDoubleDigit(startDate[5])}`;
		const endTimeString = `${Misc.fromSingleToDoubleDigit(endDate[4])}:${Misc.fromSingleToDoubleDigit(endDate[5])}`

		let dateString = startDateString;
		if (startDateString != endDateString) dateString += ` -  ${endDateString}`;

		let timeString = startTimeString;
		if(startTimeString != endTimeString) timeString += ` - ${endTimeString}`;

		const hasTimeDetails = startTimeString != "00:00";

		return {
			title,
			dateString,
			timeString,
			hasTimeDetails
		};
	}
}

const pluginSpec: PluginSpec<NLPPlugin> = {
	decorations: (value: NLPPlugin) => value.decorations,
};

const nlpPlugin = ViewPlugin.fromClass(
	NLPPlugin,
	pluginSpec
);

export default nlpPlugin;
