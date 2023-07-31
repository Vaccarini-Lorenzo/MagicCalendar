export default class Misc {
    private static stringifyDateNumber(dateNumber: Number): string {
        return dateNumber.toString().length == 1 ? "0" + dateNumber.toString() : dateNumber.toString()
    }

    static stringifyDateArray(dateArray: Number[]){
        return `${Misc.stringifyDateNumber(dateArray[0])}-${Misc.stringifyDateNumber(dateArray[1])}-${Misc.stringifyDateNumber(dateArray[2])}`;
    }

    private static getDateComponents(date: Date): {[key:string]: Number}{
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let hour = date.getHours();
        let minutes = date.getMinutes();
        return {
            year,
            month,
            day,
            hour,
            minutes
        }
    }

    static getArrayDate(date: Date) {
        let dateComponents = Misc.getDateComponents(date);
        // TODO: Understand wtf is this
        let arbitrary = 240;
        let monthString = dateComponents.month.toString().length == 1 ? "0" + dateComponents.month.toString() : dateComponents.month.toString();
        let completeDate = Number(`${dateComponents.year}${monthString}${dateComponents.day}`)
        return [completeDate, dateComponents.year, dateComponents.month, dateComponents.day, dateComponents.hour, dateComponents.minutes, arbitrary];
    }

    static getRandomHex(max: number): string{
        return (Math.floor(Math.random() * max)).toString(16).toUpperCase();
    }
}