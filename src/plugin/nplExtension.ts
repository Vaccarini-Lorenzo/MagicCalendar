import { Extension, RangeSetBuilder, StateField, Transaction, } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import nplController from "../controllers/nplController";
import {HighlightWidget} from "./highlightWidget";

export class NPLStateField {
	stateField: StateField<DecorationSet>;

	// We need a cache that maps hashes to status (synced/not synced/ignored)
	// We also need a list of sentences to ignore
	constructor() {
		this.stateField = StateField.define<DecorationSet>({
			create: this.create,
			update: this.update,
			provide: this.provide
		});
	}

	create(state): DecorationSet {
		return Decoration.none;
	}

	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const sentences = transaction.state.doc.toJSON();
		sentences.forEach((sentence, i) => {

			// The idea: We can't instantiate an Event object at every match:
			// Every added letter in a document with 1+ potential event will lead to
			// (possibly multiple) object instantiation. No bueno.
			// What we could do is to keep a map of sentences to ignore (either synced or ignored)
			// and pass this list to the NPL controller.

			// const matches = nplController.process(sentence, ignoreSentences);

			const matches = nplController.process(sentence);
			if(matches.length == 0) return;

			matches.forEach(match => {
				let previousChars = 0;
				for (let j=0; j < i; j++){
					previousChars += sentences[j].length + 1;
				}

				// here we check the match status:
				// compute hash -> check cacheMap
				// if not sync, continue.
				const startsFrom = previousChars + sentence.indexOf(match)
				const endsTo = startsFrom + match.length;
				builder.add(
					startsFrom,
					endsTo,
					Decoration.replace({
						widget: new HighlightWidget(match, "toDefine", this, this.syncCallback)
					})
				);
			});
		})
		return builder.finish();
	}

	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	}

	syncCallback(){
	}
}

