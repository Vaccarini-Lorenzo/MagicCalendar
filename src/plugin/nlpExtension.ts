import { RangeSetBuilder } from "@codemirror/state";
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
			//nplController.testPOS(line);
			//const matches = [];
			const matches = nplController.process(new Sentence(filePath, line));
			if(matches == null) return false;
			matches.selection.forEach(match => {
				const matchMetadata = this.getMatchTextMetadata(documentLines, view.viewport.from, i, line, match);
				if(matchMetadata == null) return;
				const widget = this.getWidget(matches.selection, match, matchMetadata, () => {
					eventController.processEvent(matches.eventUUID);
					this.widgetFirstLoad = true;
					view.setState(view.state);
				});

				setTimeout((ref) => {
					if (ref.widgetFirstLoad) ref.widgetFirstLoad = false;
				}, 500, this);

				builder.add(
					matchMetadata.startsFrom,
					matchMetadata.endsTo,
					Decoration.replace({
						widget
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
		const capitalizedMatch = line.substring(indexOfMatch, indexOfMatch + match.value.length)
		if(indexOfMatch == -1){
			console.log("Error matching the string in the text");
			return null;
		}
		const startsFrom = previousChars + indexOfMatch;
		const endsTo = startsFrom + match.value.length;

		return {
			startsFrom,
			endsTo,
			capitalizedMatch
		}
	}


	private getWidget(matches: any, match: any, matchMetadata: { startsFrom; endsTo; capitalizedMatch }, highlightWidgetCallback: () => void): WidgetType {
		let widget: WidgetType = new HighlightWidget(matchMetadata.capitalizedMatch, highlightWidgetCallback , this.widgetFirstLoad);
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
}

const pluginSpec: PluginSpec<NLPPlugin> = {
	decorations: (value: NLPPlugin) => value.decorations,
};

export const nlpPlugin = ViewPlugin.fromClass(
	NLPPlugin,
	pluginSpec
);
