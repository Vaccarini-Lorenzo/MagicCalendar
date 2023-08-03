import { Extension, RangeSetBuilder, StateField, Transaction, } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import nplController from "../controllers/nplController";
import { syntaxTree } from "@codemirror/language";

//class testWidget

export class NPLStateField {
	stateField: StateField<DecorationSet>;

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
			const match = nplController.process(sentence);
			if(match == null) return;
			console.log("Match!");
			let previousChars = 0;
			for (let j=0; j < i; j++){
				previousChars += sentences[j].length + 1;
			}
			const startsFrom = previousChars + sentence.indexOf(match)
			const endsTo = startsFrom + match.length;
			console.log(startsFrom, endsTo);
			builder.add(
				startsFrom,
				endsTo,
				Decoration.mark({
					tagName: "mark"
				})
			);
		});
		return builder.finish();
	}

	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	}
}

