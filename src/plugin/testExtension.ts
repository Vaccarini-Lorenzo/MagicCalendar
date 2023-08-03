import { syntaxTree } from "@codemirror/language";
import { Extension, RangeSetBuilder, StateField, Transaction, } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

export const emojiListField = StateField.define<DecorationSet>({
	create,
	update,
	provide
});

function create(state): DecorationSet {
	return Decoration.none;
}

function builderAdd(builder, listCharFrom, listCharTo){
	builder.add(
		listCharFrom,
		listCharTo,
		Decoration.mark({
			tagName: "mark"
		})
	);
}

function update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const sentences = transaction.state.doc.toJSON();
	sentences.forEach()
	return builder.finish();
}

function provide(field: StateField<DecorationSet>): Extension {
	return EditorView.decorations.from(field);
}
