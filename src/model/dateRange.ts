export class DateRange {
	start: Date;
	end: Date;

	constructor(start: Date, end: Date) {
		this.start = start;
		this.end = end;
	}

	getDayDifference(): number{
		const maxTimeMilli = this.end.getTime();
		const minTimeMilli = this.start.getTime();
		const maxDateDelta =  maxTimeMilli - minTimeMilli;
		const milliInDay = 1000 * 3600 * 24;
		return Math.round(maxDateDelta / milliInDay);
	}

	overlaps(dateRange: DateRange): boolean {
		if (dateRange.start >= this.start && dateRange.start < this.end) return true;
		if (dateRange.end >= this.start && dateRange.end < this.end) return true;
		if (dateRange.start <= this.start && dateRange.end >= this.end) return true;
		return false;
	}
}
