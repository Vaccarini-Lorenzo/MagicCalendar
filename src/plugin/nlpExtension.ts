import { RangeSetBuilder } from "@codemirror/state";
import nplController from "../controllers/nlpController";
import { HighlightWidget } from "./highlightWidget";
import { Decoration, DecorationSet, EditorView, PluginSpec, PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Sentence } from "../model/sentence";
import eventController from "../controllers/eventController";
import Event from "../model/event";
import { Misc } from "../misc/misc";

class NLPPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
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
			if(matches == null) return false;
			const eventDetailString = this.getEventDetail(matches.event);
			matches.selection.forEach(match => {
				const matchMetadata = this.getMatchTextMetadata(documentLines, view.viewport.from, i, line, match);
				if(matchMetadata == null) return;
				const decoration = this.getDecoration(matches.selection, match, matchMetadata, (sync) => {
					/*
					if (!iCloudController.isLoggedIn()){
						new Notice("You're not logged in! 🥲\nLook for iCalSync in the command palette to log in")
						return;
					}
					 */
					eventController.processEvent(filePath, sync);
					view.setState(view.state);
				}, eventDetailString);

				try{
					builder.add(
						matchMetadata.startsFrom,
						matchMetadata.endsTo,
						decoration
					);
				} catch (e){
					// Nothing to see here
				}
			});
			return true;
		})
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


	private getDecoration(matches: {value, index, type}[], match: {value, index, type}, matchMetadata: { startsFrom; endsTo; capitalizedMatch }, highlightWidgetCallback: (sync: boolean) => void, eventDetailString): Decoration {
		let decoration = Decoration.mark({
			tagName: "span",
			class: "underlinedTextDynamic"
			});
		//let widget: WidgetType = new HighlightWidget(matchMetadata.capitalizedMatch, eventDetailString, highlightWidgetCallback , this.widgetFirstLoad);
		const isExplicitDatePresent = matches.filter(match => match.type == "date" || match.type == "ordinalDate" || match.type == "ordinalDateReverse").length > 0;
		// If there is no explicit date, highlight the exactTime/timeRange
		// e.g.: At 2 o'clock I'll join a meeting  <-  2 o'clock should be highlighted
		if((isExplicitDatePresent &&  (match.type == "date" || match.type == "ordinalDate" || match.type == "ordinalDateReverse")) || (!isExplicitDatePresent && (match.type == "timeRange" || match.type == "exactTime"))){
			const widget = new HighlightWidget(matchMetadata.capitalizedMatch, eventDetailString, highlightWidgetCallback);
			decoration = Decoration.replace({
				widget
			});
		}
		return decoration;
	}

	private getEventDetail(event: Event): {title, dateString, timeString, hasTimeDetails} {
		const title = event.value.cloudEventTitle;
		const startDate = event.value.cloudEventStartDate;
		const endDate = event.value.cloudEventEndDate;

		const startDateString = `${startDate.getFullYear()}/${Misc.fromSingleToDoubleDigit(startDate.getMonth() + 1)}/${Misc.fromSingleToDoubleDigit(startDate.getDate())}`
		const endDateString = `${endDate.getFullYear()}/${Misc.fromSingleToDoubleDigit(endDate.getMonth() + 1)}/${Misc.fromSingleToDoubleDigit(endDate.getDate())}`;
		const startTimeString = `${Misc.fromSingleToDoubleDigit(startDate.getHours())}:${Misc.fromSingleToDoubleDigit(startDate.getMinutes())}`;
		const endTimeString = `${Misc.fromSingleToDoubleDigit(endDate.getHours())}:${Misc.fromSingleToDoubleDigit(endDate.getMinutes())}`

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
