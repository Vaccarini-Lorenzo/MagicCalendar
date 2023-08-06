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

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
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
			if(matches.length == 0) return false;
			matches.selection.forEach(match => {
				//let search = new SearchCursor(Text.of([line]), match).next();
				let previousChars = view.viewport.from;
				for (let j=0; j < i; j++){
					previousChars += documentLines[j].length + 1;
				}

				// here we check the match status:
				// compute hash -> check cacheMap
				// if not sync, continue.
				const indexOfMatch = line.toLowerCase().indexOf(match.value);
				const capitalizedMatch = line.substring(indexOfMatch, indexOfMatch + match.value.length)
				if(indexOfMatch == -1){
					console.log("Error matching the string in the text");
					return false;
				}
				const startsFrom = previousChars + indexOfMatch;
				const endsTo = startsFrom + match.value.length;
				//console.log(match)
				//console.log(search.value.from, search.value.to);
				let widget: WidgetType;
				widget = new HighlightWidget(capitalizedMatch, "toDefine", () => {
					eventController.processEvent(matches.eventUUID)
				});
				if (match.type == "properName" || match.type == "eventNoun"
					|| match.type == "commonNoun" || match.type == "exactTime"
					|| match.type == "timeRange"){
					widget = new UnderlineWidget(capitalizedMatch);
				}
				builder.add(
					startsFrom,
					endsTo,
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
}

const pluginSpec: PluginSpec<NLPPlugin> = {
	decorations: (value: NLPPlugin) => value.decorations,
};

export const nlpPlugin = ViewPlugin.fromClass(
	NLPPlugin,
	pluginSpec
);
