import {RangeSetBuilder} from "@codemirror/state";
import nplController from "../controllers/nlpController";
import {HighlightWidget} from "./highlightWidget";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import {UnderlineWidget} from "./underLineWidget";
import {Sentence} from "../model/sentence";
import eventController from "../controllers/eventController";
import Event from "../model/event";
import {Misc} from "../misc/misc";

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
		const activeFile = app.workspace.getActiveFile();
		const filePath = activeFile == undefined ? "error": activeFile.path;
		const builder = new RangeSetBuilder<Decoration>();
		const documentLines = view.state.doc.slice(view.viewport.from, view.viewport.to).toJSON();
		documentLines.some((line, i) => {
			//nplController.testPOS(new Sentence(filePath, line));
			//const matches = null;
			const matches = nplController.process(new Sentence(filePath, line));
			if(matches == null) return false;
			const eventDetailString = this.getEventDetailString(matches.event);
			matches.selection.forEach(match => {
				const matchMetadata = this.getMatchTextMetadata(documentLines, view.viewport.from, i, line, match);
				if(matchMetadata == null) return;
				const widget = this.getWidget(matches.selection, match, matchMetadata, () => {
					eventController.processEvent(matches.event.value.guid);
					this.widgetFirstLoad = true;
					view.setState(view.state);
				}, eventDetailString);

				setTimeout((ref) => {
					if (ref.widgetFirstLoad) ref.widgetFirstLoad = false;
				}, 500, this);

				builder.add(
					matchMetadata.startsFrom,
					matchMetadata.endsTo,
					Decoration.replace({
						widget,
					})
				);
			});
			return true;
		})
		return builder.finish();
	}

	destroy() {
		// ...
	}

	// TODO: fix any
	private getMatchTextMetadata(documentLines: string[], viewPortFrom: number, currentIndex: number, line: string, match: {value, index, type}): {startsFrom, endsTo, capitalizedMatch} | null {
		let previousChars = viewPortFrom;
		for (let j=0; j < currentIndex; j++){
			previousChars += documentLines[j].length + 1;
		}
		// here we check the match status:
		// compute hash -> check cacheMap
		// if not sync, continue.
		const indexOfMatch = line.toLowerCase().indexOf(match.value);
		if(indexOfMatch == -1){
			console.log("Error matching the string in the text");
			return null;
		}
		const capitalizedMatch = line.substring(indexOfMatch, indexOfMatch + match.value.length)
		const startsFrom = previousChars + indexOfMatch;
		const endsTo = startsFrom + match.value.length;

		return {
			startsFrom,
			endsTo,
			capitalizedMatch
		}
	}


	private getWidget(matches: {value, index, type}[], match: {value, index, type}, matchMetadata: { startsFrom; endsTo; capitalizedMatch }, highlightWidgetCallback: () => void, eventDetailString): WidgetType {
		let widget: WidgetType = new HighlightWidget(matchMetadata.capitalizedMatch, eventDetailString, highlightWidgetCallback , this.widgetFirstLoad);
		const isExplicitDatePresent = matches.filter(match => match.type == "date" || match.type == "ordinalDate" || match.type == "ordinalDateReverse").length > 0;
		if (match.type == "properName" || match.type == "eventNoun" || match.type == "commonNoun") {
			widget = new UnderlineWidget(matchMetadata.capitalizedMatch, this.widgetFirstLoad);
		}
		// If there is no explicit date, highlight the exactTime/timeRange
		// e.g.: At 2 o'clock I'll join a meeting  <-  2 o'clock should be highlighted
		if(isExplicitDatePresent && (match.type == "exactTime" || match.type == "timeRange")){
			widget = new UnderlineWidget(matchMetadata.capitalizedMatch, this.widgetFirstLoad);
		}
		return widget;
	}

	private getEventDetailString(event: Event) {
		const title = event.value.title;
		const startDate = event.value.startDate;
		const endDate = event.value.endDate;

		// startDate, exactly like endDate is an array as the following [yearmonthdaystring, year, month, day, hour, min ...]
		const startDateString = `${startDate[1]}/${Misc.fromSingleToDoubleDigit(startDate[2])}/${Misc.fromSingleToDoubleDigit(startDate[3])}`
		const endDateString = `${endDate[1]}/${Misc.fromSingleToDoubleDigit(endDate[2])}/${Misc.fromSingleToDoubleDigit(endDate[3])}`;
		const startTimeString = `${Misc.fromSingleToDoubleDigit(startDate[4])}:${Misc.fromSingleToDoubleDigit(startDate[5])}`;
		const endTimeString = `${Misc.fromSingleToDoubleDigit(endDate[4])}:${Misc.fromSingleToDoubleDigit(endDate[5])}`

		let dateString = startDateString;
		if (startDateString != endDateString) dateString += ` -  ${endDateString}`;

		let timeString = startTimeString;
		if(startTimeString != endTimeString) timeString += ` - ${endTimeString}`;

		let eventDetailString = `<span class="sidebar"> 📕 </span> <span class="content"> ${title} </span> <span class="sidebar"> 📅 </span> <span class="content"> ${dateString} </span>`;

		if (startTimeString != "00:00") eventDetailString += ` <span class="sidebar"> 🕑 </span><span class="content"> ${timeString} </span>`;
		return eventDetailString;
	}
}

const pluginSpec: PluginSpec<NLPPlugin> = {
	decorations: (value: NLPPlugin) => value.decorations,
};

export const nlpPlugin = ViewPlugin.fromClass(
	NLPPlugin,
	pluginSpec
);
