import { Extension, RangeSetBuilder, StateField, Transaction, Text } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import nplController from "../controllers/nlpController";
import {HighlightWidget} from "./highlightWidget";
import {
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";

import {SearchCursor} from "@codemirror/search"

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

		//const activeFile = app.workspace.getActiveFile();
		//if (activeFile != undefined) console.log("path = " + activeFile.path);
		const rangeMap = new Map<number, number>()
		const builder = new RangeSetBuilder<Decoration>();
		const sentences = view.state.doc.slice(view.viewport.from, view.viewport.to).toJSON();
		//const sentences = nplController.splitIntoSentences(state);
		sentences.forEach((sentence, i) => {
			//nplController.test(sentence);

			// The idea: We can't instantiate an Event object at every match:
			// Every added letter in a document with 1+ potential event will lead to
			// (possibly multiple) object instantiation. No bueno.
			// What we could do is to keep a map of sentences to ignore (either synced or ignored)
			// and pass this list to the NPL controller.

			// const matches = nplController.process(sentence, ignoreSentences);

			const matches = nplController.process(sentence);
			if(matches.length == 0) return;

			matches.forEach(match => {
				//let search = new SearchCursor(Text.of([sentence]), match).next();
				let previousChars = view.viewport.from;
				for (let j=0; j < i; j++){
					previousChars += sentences[j].length + 1;
				}

				// here we check the match status:
				// compute hash -> check cacheMap
				// if not sync, continue.
				const indexOfMatch = sentence.toLowerCase().indexOf(match);
				const capitalizedMatch = sentence.substring(indexOfMatch, indexOfMatch + match.length)
				if(indexOfMatch == -1){
					console.log("Error matching the string in the text");
					return;
				}
				const startsFrom = previousChars + indexOfMatch;
				const endsTo = startsFrom + match.length;
				console.log(match)
				//console.log(search.value.from, search.value.to);
				if(rangeMap.has(startsFrom)) return;
				rangeMap.set(startsFrom, endsTo);
				builder.add(
					startsFrom,
					endsTo,
					Decoration.replace({
						widget: new HighlightWidget(capitalizedMatch, "toDefine", this, () => {})
					})
				);

			});
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
