export class Misc {
	static isLowerCase(str) {
		return str === str.toLowerCase() &&
			str !== str.toUpperCase();
	}

	static fromSingleToDoubleDigit(num: number): string {
		if (num.toString().length == 1) return `0${num}`
		return num.toString();
	}
}
