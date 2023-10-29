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
	dropCallback: (cloudEventUUID: string, updateMap: Map<string, string>) => void;

	constructor(containerEl: HTMLElement, calendarViewData: CalendarViewData, dropCallback: (cloudEventUUID, updateMap) => void) {
		this.removeListeners(containerEl);
		this.dropCallback = dropCallback;
		this.calendarViewData = calendarViewData;
		this.paletteNumber = 22;
		this.paletteIndex = 0;
		this.numOfEvents = this.calendarViewData.calendarViewDetails.length;
		const paletteEventRatio = Math.round(this.paletteNumber / this.numOfEvents);
		this.paletteIndexIncrease = paletteEventRatio == 0 ? 1 : paletteEventRatio;
		this.consecutiveOverlapIndex = 0;
		this.html = this.getHTML(containerEl);
		this.addListeners(containerEl);
	}


	private removeListeners(containerEl: HTMLElement){
		Misc.bindListeners.forEach(bindListener => {
			containerEl.doc.removeEventListener(bindListener.type, bindListener.eventCallback);
		})
	}

	private addListeners(containerEl: HTMLElement){
		const dropBind = this.drop.bind(this);
		containerEl.doc.addEventListener("dragover", this.allowDrop);
		containerEl.doc.addEventListener("drop", dropBind);
		Misc.bindListeners.push({type: "dragover", doc: containerEl.doc, eventCallback: this.allowDrop});
		Misc.bindListeners.push({type: "drop", doc: containerEl.doc, eventCallback: dropBind});
	}

	private getHTML(containerEl: HTMLElement): HTMLElement{
		const wrapper = containerEl.createEl("div");
		wrapper.addClass("icalTableWrapper")
		const table = wrapper.createEl("table");
		table.addClass("icalTable");
		this.generateHeaders(table, true);
		this.generateRows(table)
		this.generateHeaders(table);
		return table;
	}

	private generateHeaders(table: HTMLTableElement, needLabel?: boolean){
		table.createEl("th").addClass("icalTh");
		let headerHours = 0;
		let headerMinutes = 0;
		let labelIndex = 1;
		for (let column = 0; column < this.calendarViewData.numOfCols; column++){
			labelIndex ++;
			const header = table.createEl("th");
			header.addClass("icalTh");
			header.addClass("icalShiftedCell");
			if (labelIndex % 2 == 0 && needLabel) {
				header.innerText = `${Misc.fromSingleToDoubleDigit(headerHours)}:${Misc.fromSingleToDoubleDigit(headerMinutes)}`;
			}
			if (headerMinutes == 0) headerMinutes = 30;
			else {
				headerMinutes = 0
				headerHours++;
			}
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

	private initRow(table: HTMLElement, date: Date, needsLabel: boolean): HTMLElement {
		const row = table.createEl("tr");
		const leftLabel = row.createEl("td");
		leftLabel.addClass("icalTd");
		row.id = date.toISOString();
		if (!needsLabel) {
			const previousDate = new Date(date);
			previousDate.setDate(previousDate.getDate() - 1);
			row.id = `${previousDate.toISOString()} - ${this.consecutiveOverlapIndex}`;
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
				this.createEventCell(row, calendarViewDetail, calendarViewDetail.cloudEventUUID);
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
		if (index % 2 == 0) emptyCell.addClass("dottedBorder");
		emptyCell.setAttr("colspan", 1);
		this.makeCellDraggable(emptyCell);
		return emptyCell;
	}

	private createEventCell(row: HTMLElement, calendarViewDetail: CalendarViewDetail, cloudEventUUID: string){
		const eventCell = row.createEl("td");
		eventCell.id = Misc.generateCellID(row.id, calendarViewDetail.fromCol);
		eventCell.innerText = calendarViewDetail.title;
		eventCell.addClass(this.getPaletteClass());
		eventCell.addClass("icalEventBox");
		eventCell.addClass("icalTd");
		eventCell.setAttr("colspan", calendarViewDetail.toCol - calendarViewDetail.fromCol);
		eventCell.setAttr("cloudEventUUID", cloudEventUUID);
		this.makeCellDraggable(eventCell);
	}

	private makeCellDraggable(cell: HTMLTableCellElement) {
		cell.draggable = true;
		cell.ondragstart = (event) => this.drag(event);
		cell.ondragenter = () => cell.classList.add("hovered");
		cell.ondragleave = () => cell.classList.remove("hovered");
		cell.ondrop = () => cell.setCssStyles({opacity: "1"});
		cell.onclick = () => {
					}
	}

	private getPaletteClass(){
		const paletteClass = `palette-${this.paletteIndex}`;
		this.paletteIndex += this.paletteIndexIncrease;
		if (this.paletteIndex == this.paletteNumber) this.paletteIndex = 0;
		return paletteClass;
	}

	private drag(event){
		Misc.dragEvent = event;
		event.target.setCssStyles({opacity: "0.1"});
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

	// TODO: Understand why it breaks when two events swap
	// TODO: Implement new row if event overlaps [at the moment it just writes on top of the other event]

	drop(event) {
		event.preventDefault();
		if (event.target.tagName !== "TD" || Misc.dragEvent.target === event.target) return;
		//if (event.target.parentNode.id != Misc.dragEvent.target.parentNode.id) this.manageChangeRow(event);
		const cloudEventUUID = Misc.dragEvent.target.attributes.getNamedItem("cloudeventuuid").value;
		const dragColSpan = Misc.dragEvent.target.attributes.getNamedItem("colspan").value;
		if (!cloudEventUUID) return;
		const updateMap = new Map<string, string>();
		const updatedStartDate = Misc.getStartDateFromCellID(event.target.id);
		const updatedEndDate = new Date(updatedStartDate);
		updatedEndDate.setTime(updatedStartDate.getTime() + Misc.getTimeFromColSpan(dragColSpan))
		updateMap.set("cloudEventStartDate", updatedStartDate.toISOString());
		updateMap.set("cloudEventEndDate", updatedEndDate.toISOString());
				this.dropCallback(cloudEventUUID, updateMap);
		//this.swapCells(event);
	}

	/*

	private manageChangeRow(event){
		// Event moved from a row to another
		const dragColSpan = Number(Misc.dragEvent.target.attributes.getNamedItem("colspan").value);
		const dropColSpan = Number(event.target.attributes.getNamedItem("colspan").value);
		const dragRow = Misc.dragEvent.target.parentNode;
		const dropRow = event.target.parentNode;
		if (!dropRow) return;
		const dragNextCellIndex = Misc.cellIndexFromID(Misc.dragEvent.target.id);
		const dropNextCellIndex = Misc.cellIndexFromID(event.target.id);

		const requireNewCellsRow = dragColSpan < dropColSpan ? dropRow : dragRow;
		const requireCellRemovalRow = dragColSpan < dropColSpan ? dragRow : dropRow;
		const minColSpan = dragColSpan < dropColSpan ? dragColSpan : dropColSpan;
		const minSpanNextCellIndex = dragColSpan < dropColSpan ? dragNextCellIndex : dropNextCellIndex;
		const maxSpanNextCellIndex = dragColSpan < dropColSpan ? dropNextCellIndex : dragNextCellIndex;

		let refCell = dragColSpan < dropColSpan ? event.target : Misc.dragEvent.target;

		const colSpanDiff = Math.abs(dragColSpan - dropColSpan);
		let notExistingCells = 0;
		for (let i=minSpanNextCellIndex; i<minSpanNextCellIndex + colSpanDiff; i++) {
			const removedCell = requireCellRemovalRow.querySelector(`[id='${Misc.generateCellID(requireCellRemovalRow.id, i)}']`);
			if (removedCell) {
				removedCell.remove();
			} else {
				notExistingCells++;
			}
		}
		for (let i=minSpanNextCellIndex + colSpanDiff; i<minSpanNextCellIndex + colSpanDiff + notExistingCells; i++) {
			const removedCell = requireCellRemovalRow.querySelector(`[id='${Misc.generateCellID(requireCellRemovalRow.id, i)}']`);
			if (removedCell) {
				removedCell.remove();
			}
		}


		for (let i=maxSpanNextCellIndex; i<maxSpanNextCellIndex + colSpanDiff; i++){
			const newCell = this.createEmptyCell(requireNewCellsRow, i);
			requireNewCellsRow.insertAfter(newCell, refCell);
			refCell = newCell;
		}
	}

	private swapCells(event) {
		this.swapInnerHTML(event);
		this.swapClasses(event);
		this.swapAttributes(event);
	}

	private swapInnerHTML(event) {
		const draggedInnerHTML = event.dataTransfer.getData("text/plain");
		Misc.dragEvent.target.innerHTML = event.target.innerHTML;
		event.target.innerHTML = draggedInnerHTML;
	}

	private swapClasses(event) {
		const draggedClassList = JSON.parse(event.dataTransfer.getData("classList"));
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
	}

	private swapAttributes(event) {
		const draggedAttributes =  Array.from(Object.entries(JSON.parse(event.dataTransfer.getData("attributes"))));
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

	 */
}
