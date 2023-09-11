import {Misc} from "../misc/misc";
import {CalendarViewData} from "../model/calendarViewData";
import {CalendarViewDetail} from "../model/calendarViewDetail";

export class CalendarViewHTML {
	html: HTMLElement;
	calendarViewData: CalendarViewData;
	paletteNumber: number;
	paletteIndex: number;
	numOfEvents: number;
	paletteIndexIncrease: number;
	consecutiveOverlapIndex: number;

	constructor(containerEl: HTMLElement, calendarViewData: CalendarViewData) {
		Misc.bindListeners.forEach(bindListener => {
			console.log("removing listener");
			containerEl.doc.removeEventListener(bindListener.type, bindListener.eventCallback);
		})
		this.calendarViewData = calendarViewData;
		this.paletteNumber = 22;
		this.paletteIndex = 0;
		this.numOfEvents = this.calendarViewData.calendarViewDetails.length;
		const paletteEventRatio = Math.round(this.paletteNumber / this.numOfEvents);
		this.paletteIndexIncrease = paletteEventRatio == 0 ? 1 : paletteEventRatio;
		this.consecutiveOverlapIndex = 0;
		const wrapper = containerEl.createEl("div");
		wrapper.addClass("icalTableWrapper")
		const table = wrapper.createEl("table");
		table.addClass("icalTable");
		this.generateHeaders(table);
		this.generateRows(table)
		this.generateHeaders(table);
		this.html = table;
		const dropBind = this.drop.bind(this);
		containerEl.doc.addEventListener("dragover", this.allowDrop);
		containerEl.doc.addEventListener("drop", dropBind);
		Misc.bindListeners.push({type: "dragover", eventCallback: this.allowDrop});
		Misc.bindListeners.push({type: "drop", eventCallback: dropBind});
	}

	private generateHeaders(table: HTMLTableElement){
		table.createEl("th").addClass("icalTh");
		for (let column = 0; column < this.calendarViewData.numOfCols; column++){
			table.createEl("th").addClass("icalTh")
		}
	}

	private generateRows(table: HTMLTableElement) {
		const date = this.calendarViewData.startDate;

		for (let rowIndex = 0; rowIndex < this.calendarViewData.numOfRows; rowIndex++){
			const needsLabel = this.calendarViewData.rowNeedsLabelMap.get(rowIndex);

			const row = this.initRow(table, date, needsLabel);
			this.fillEventsCells(row, rowIndex);
		}
	}

	private initRow(table: HTMLElement, date: Date, needsLabel: boolean): HTMLElement{
		const row = table.createEl("tr");
		const leftLabel = row.createEl("td");
		leftLabel.addClass("icalTd");
		row.id = date.toLocaleDateString();
		if (!needsLabel){
			const previousDate = new Date(date);
			previousDate.setDate(previousDate.getDate() - 1);
			row.id = `${previousDate.toLocaleDateString()} - ${this.consecutiveOverlapIndex}`;
			this.consecutiveOverlapIndex++;
			return row;
		}
		this.consecutiveOverlapIndex = 0;
		leftLabel.innerText  = date.toLocaleDateString();
		// TODO: Fix, not precise
		date.setDate(date.getDate() + 1);
		return row;
	}

	// TODO: Fix method granularity
	private fillEventsCells(row: HTMLElement, rowIndex: number) {
		const calendarEventDetails = this.calendarViewData.calendarViewDetails.filter(calendarViewDetail => calendarViewDetail.row == rowIndex);
		let columnIndex = 0;
		if (calendarEventDetails.length != 0){
			calendarEventDetails.sort(function(a, b){return a.fromCol - b.fromCol})
			calendarEventDetails.forEach(calendarViewDetail => {
				for (let i = columnIndex; i < calendarViewDetail.fromCol; i++){
					this.createEmptyCell(row, i);
				}
				this.createEventCell(row, calendarViewDetail);
				columnIndex = calendarViewDetail.toCol;
			})
		}
		for (let i = columnIndex; i < this.calendarViewData.numOfCols; i++){
			this.createEmptyCell(row, i);
		}
	}

	private createEmptyCell(row: HTMLElement, index: number): HTMLElement{
		const emptyCell = row.createEl("td");
		emptyCell.id = Misc.generateCellID(row.id, index);
		emptyCell.addClass("icalTd");
		//emptyCell.innerText = index.toString();
		emptyCell.draggable = true;
		emptyCell.ondragstart = (event) => this.drag(event);
		emptyCell.setAttr("colspan", 1);
		return emptyCell;
	}

	private createEventCell(row: HTMLElement, calendarViewDetail: CalendarViewDetail){
		const eventCell = row.createEl("td");
		eventCell.id = Misc.generateCellID(row.id, calendarViewDetail.fromCol);
		eventCell.innerText = calendarViewDetail.title;
		eventCell.addClass(this.getPaletteClass());
		eventCell.addClass("icalEventBox");
		eventCell.addClass("icalTd");
		eventCell.setAttr("colspan", calendarViewDetail.toCol - calendarViewDetail.fromCol)
		eventCell.draggable = true;
		eventCell.ondragstart = (event) => this.drag(event);
	}

	private getPaletteClass(){
		const paletteClass = `palette-${this.paletteIndex}`;
		this.paletteIndex += this.paletteIndexIncrease;
		if (this.paletteIndex == this.paletteNumber) this.paletteIndex = 0;
		return paletteClass;
	}

















	private drag(event){
		Misc.dragEvent = event;
		event.dataTransfer.setData("text/plain", event.target.innerHTML);
		// NamedNodeMap
		const attributes = Object.assign({},
			...Array.from(event.target.attributes, ({name, value}) => ({[name]: value}))
		);
		event.dataTransfer.setData("attributes", JSON.stringify(attributes));
		event.dataTransfer.setData("classList", JSON.stringify(Array.from(event.target.classList)));
	}

	private allowDrop(event) {
		event.preventDefault();
	}

	drop(event) {
		//console.log("drop id", event.target.innerText);
		event.preventDefault();
		if (event.target.tagName !== "TD" || Misc.dragEvent.target === event.target) return;
		if (event.target.parentNode.id != Misc.dragEvent.target.parentNode.id) this.manageChangeRow(event);
		this.swapCells(event);
	}


	private manageChangeRow(event){
		// Event moved from a row to another
		const dragColSpan = Number(Misc.dragEvent.target.attributes.getNamedItem("colspan").value);
		const dropColSpan = Number(event.target.attributes.getNamedItem("colspan").value);
		const dragRow = Misc.dragEvent.target.parentNode;
		const dropRow = event.target.parentNode;
		if (!dropRow) return;
		console.log("dropRow", dropRow.id);
		const dragCellIndex = Misc.cellIndexFromID(Misc.dragEvent.target.id);
		const dropCellIndex = Misc.cellIndexFromID(event.target.id);

		// Remove from the new row a # of cells = of the colspan of the dragged cell - dropped cell
		for (let i=dropCellIndex; i<dropCellIndex + dragColSpan - dropColSpan; i++){
			const removedCell = dropRow.querySelector(`[id='${Misc.generateCellID(dropRow.id, i)}']`);
			if (removedCell) {
				console.log("removedCell", removedCell);
				removedCell.remove();
			}
		}

		// Add to the old row a # of cells = of the colspan of the dragged cell - dropped cell
		let refCell = Misc.dragEvent.target;
		console.log("refCell id", refCell.id);
		for (let i=dragCellIndex; i<dragCellIndex + dragColSpan - dropColSpan; i++){
			const newCell = this.createEmptyCell(dragRow, i);
			dragRow.insertAfter(newCell, refCell);
			refCell = newCell;
		}
	}

	private swapCells(event) {
		const draggedInnerHTML = event.dataTransfer.getData("text/plain");
		const draggedClassList = JSON.parse(event.dataTransfer.getData("classList"));
		const draggedAttributes =  Array.from(Object.entries(JSON.parse(event.dataTransfer.getData("attributes"))));

		// Swap inner HTML
		Misc.dragEvent.target.innerHTML = event.target.innerHTML;
		event.target.innerHTML = draggedInnerHTML;

		// Swap classes
		// Empty dragged cell class list
		Misc.dragEvent.target.classList = [];

		// Fill dragged cell class list with dropped cell classes
		for (const droppedClassName of event.target.classList) {
			Misc.dragEvent.target.classList.add(droppedClassName);
		}

		// Empty drop cell classList
		event.target.classList = [];
		for (const draggedClassName of draggedClassList) {
			event.target.classList.add(draggedClassName);
		}

		// Swap attributes
		// Empty drag cell attributes
		for (let i=0; i<Misc.dragEvent.target.attributes.length; i++){
			if (Misc.dragEvent.target.attributes.item(i) == null) continue;
			if (Misc.dragEvent.target.attributes.item(i).name == "id") continue;
			Misc.dragEvent.target.attributes.removeNamedItem(Misc.dragEvent.target.attributes.item(i).name)
		}

		const droppedAttributes = Array.from(Object.entries(Object.assign({},
			...Array.from(event.target.attributes, ({name, value}) => ({[name]: value}))
		)));

		// Fill drag cell attributes
		for (const droppedAttribute of droppedAttributes){
			if (droppedAttribute[0] == "id") continue;
			const attr = document.createAttribute(droppedAttribute[0]);
			attr.value = droppedAttribute[1] as string;
			Misc.dragEvent.target.attributes.setNamedItem(attr);
		}

		// Empty drop cell attributes
		for (let i=0; i<event.target.attributes.length; i++){
			if (event.target.attributes.item(i) == null) continue;
			if (event.target.attributes.item(i).name == "id") continue;
			event.target.attributes.removeNamedItem(event.target.attributes.item(i).name)
		}

		// Fill drag cell attributes
		for (const draggedAttribute of draggedAttributes){
			if (draggedAttribute[0] == "id") continue;
			const attr = document.createAttribute(draggedAttribute[0]);
			attr.value = draggedAttribute[1] as string;
			event.target.attributes.setNamedItem(attr);
		}
	}
}
