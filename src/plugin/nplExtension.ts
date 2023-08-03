import { Extension, RangeSetBuilder, StateField, Transaction, } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import NPLController from "../controllers/nplController";


export class NPLStateField {
	stateField: StateField<DecorationSet>;
	private _npl: NPLController;

	constructor(pluginPath: string) {
		this.stateField = StateField.define<DecorationSet>({
			create: this.create,
			update: this.update,
			provide: this.provide
		});
		this._npl = new NPLController(pluginPath);
		this._npl.loadPatterns();
	}

	create(state): DecorationSet {
		return Decoration.none;
	}

	builderAdd(builder, listCharFrom, listCharTo){
		builder.add(
			listCharFrom,
			listCharTo,
			Decoration.mark({
				tagName: "mark"
			})
		);
	}

	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const sentences = transaction.state.doc.toJSON();
		//sentences.forEach()
		console.log(sentences);
		return builder.finish();
	}

	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	}
}

