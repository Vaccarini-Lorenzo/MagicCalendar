import {Misc} from "../misc/misc";

export class CalendarViewHTML {
	html: HTMLElement;
	calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate};
	paletteNumber: number;
	paletteIndex: number;
	numOfEvents: number;
	paletteIndexIncrease: number;
	dragEvent = null;

	constructor(containerEl: HTMLElement, calendarViewData: {numOfCols, numOfRows, rowNeedsLabelMap, calendarViewDetails, startDate}) {
		this.calendarViewData = calendarViewData;
		this.calendarViewData = calendarViewData;
		this.paletteNumber = 22;
		this.paletteIndex = 0;
		this.numOfEvents = this.calendarViewData.calendarViewDetails.length;
		const paletteEventRatio = Math.round(this.paletteNumber / this.numOfEvents);
		this.paletteIndexIncrease = paletteEventRatio == 0 ? 1 : paletteEventRatio;
		const wrapper = containerEl.createEl("div");
		wrapper.addClass("icalTableWrapper")
		const table = wrapper.createEl("table");
		table.addClass("icalTable");
		this.generateHeaders(table);
		this.generateRows(table)
		this.generateHeaders(table);
		this.html = table;
		containerEl.doc.addEventListener("dragover", this.allowDrop);
		containerEl.doc.addEventListener("drop", this.drop);
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
		if (!needsLabel) return row;
		leftLabel.innerText  = date.toLocaleDateString();
		date.setDate(date.getDate() + 1);
		return row;
	}

	private fillEventsCells(row: HTMLElement, rowIndex: number) {
		const calendarEventDetails = this.calendarViewData.calendarViewDetails.filter(calendarViewDetail => calendarViewDetail.row == rowIndex);
		let columnIndex = 0;
		if (calendarEventDetails.length != 0){
			calendarEventDetails.sort(function(a, b){return a.fromCol - b.fromCol})
			calendarEventDetails.forEach(event => {
				for (let i = columnIndex; i < event.fromCol; i++){
					const emptyCell = row.createEl("td");
					emptyCell.addClass("icalTd");
					emptyCell.draggable = true;
					emptyCell.ondragstart = (event) => this.drag(event);
					emptyCell.setAttr("colspan", 1);
				}
				const eventCell = row.createEl("td");
				eventCell.innerText = event.title;
				eventCell.addClass(this.getPaletteClass());
				eventCell.addClass("icalEventBox");
				eventCell.addClass("icalTd");
				eventCell.setAttr("colspan", event.toCol - event.fromCol)
				eventCell.draggable = true;
				eventCell.ondragstart = (event) => this.drag(event);
				columnIndex = event.toCol;
			})
		}

		for (let i = columnIndex; i < this.calendarViewData.numOfCols; i++){
			const emptyCell = row.createEl("td");
			emptyCell.addClass("icalTd");
			emptyCell.draggable = true;
			emptyCell.ondragstart = (event) => this.drag(event);
			emptyCell.setAttr("colspan", 1);
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
		console.log(event);
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
		event.preventDefault();
		if (event.target.tagName === "TD" && Misc.dragEvent.target !== event.target) {
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
			for (let i=0; i<Misc.dragEvent.target.attributes.length; i++){
				console.log("removing", Misc.dragEvent.target.attributes.item(i));
				if (Misc.dragEvent.target.attributes.item(i) == null) continue;
				Misc.dragEvent.target.attributes.removeNamedItem(Misc.dragEvent.target.attributes.item(i).name)
			}
			const droppedAttributes = Array.from(Object.entries(Object.assign({},
				...Array.from(event.target.attributes, ({name, value}) => ({[name]: value}))
			)));
			console.log("droppedAttributes", droppedAttributes);
			for (const droppedAttribute of droppedAttributes){
				const attr = document.createAttribute(droppedAttribute[0]);
				attr.value = droppedAttribute[1] as string;
				Misc.dragEvent.target.attributes.setNamedItem(attr);
			}
			for (let i=0; i<event.target.attributes.length; i++){
				console.log("removing", event.target.attributes.item(i));
				if (event.target.attributes.item(i) == null) continue;
				event.target.attributes.removeNamedItem(event.target.attributes.item(i).name)
			}
			for (const draggedAttribute of draggedAttributes){
				const attr = document.createAttribute(draggedAttribute[0]);
				attr.value = draggedAttribute[1] as string;
				event.target.attributes.setNamedItem(attr);
			}
		}
	}
}


/*
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Draggable Table Cells</title>
    <style>
        table {
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 10px;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            <td draggable="true" ondragstart="drag(event)">Cell 1</td>
            <td draggable="true" ondragstart="drag(event)">Cell 2</td>
            <td draggable="true" ondragstart="drag(event)">Cell 3</td>
        </tr>
        <tr>
            <td draggable="true" ondragstart="drag(event)">Cell 4</td>
            <td draggable="true" ondragstart="drag(event)">Cell 5</td>
            <td draggable="true" ondragstart="drag(event)">Cell 6</td>
        </tr>
    </table>

    <script>
        let draggedCell = null;

        function drag(event) {
            draggedCell = event.target;
            event.dataTransfer.setData("text/plain", event.target.innerHTML);
        }

        function allowDrop(event) {
            event.preventDefault();
        }

        function drop(event) {
            event.preventDefault();
            if (event.target.tagName === "TD" && draggedCell !== event.target) {
                const temp = event.target.innerHTML;
                event.target.innerHTML = event.dataTransfer.getData("text/plain");
                draggedCell.innerHTML = temp;
            }
        }

        document.addEventListener("dragover", allowDrop);
        document.addEventListener("drop", drop);
    </script>
</body>
</html>

 */
