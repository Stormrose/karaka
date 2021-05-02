// Module to reduce the frequency of repeated console messages

type QuietConsoleCache =  {[index: string]: QuietConsoleCacheItem }
interface QuietConsoleCacheItem {
    text: string
    lastprinted: Date
    linecounter: number
}

export default class QuietConsole  {
    private cache: QuietConsoleCache = {}
    private linecounter: number = 0

    constructor(private prefix: string = '', readonly linesbetweenrepeats: number = 80) {}

    public log(label: string|undefined, text: string): void {
        if(!label) return this.logWithDateAndPrefix(text)

        if(!this.cache[label]) { 
            this.cache[label] = {
                text: '',
                lastprinted: new Date(0),
                linecounter: 0
            }
        }
        const cacheitem: QuietConsoleCacheItem = this.cache[label]

        if(cacheitem.text !== text) return this.logAndCache(label, text)
        if(cacheitem.lastprinted.toDateString() !== (new Date()).toDateString()) return this.logAndCache(label, text)
        if(cacheitem.linecounter + this.linesbetweenrepeats < this.linecounter) return this.logAndCache(label, text)

        return
    }

    private logAndCache(label: string, text: string): void {
        this.cache[label] = {
            text,
            lastprinted: new Date(),
            linecounter: this.linecounter
        }
        return this.logWithDateAndPrefix(text)
    }

    private logWithDateAndPrefix(text: string): void {
        console.log(
            this.getLogDateTime() + ' ' +
            (this.prefix ? this.prefix + ': ' : '') +
            text
        )
        this.linecounter++
    }

    private getLogDateTime(): string {
        const dn: Date = new Date()
        return dn.getUTCFullYear() + '-' + (''+(dn.getUTCMonth() + 1)).padStart(2,'0') + '-' + (''+dn.getUTCDate()).padStart(2,'0') + ' ' +
            (''+dn.getUTCHours()).padStart(2,'0') + ":" + (''+dn.getUTCMinutes()).padStart(2,'0') + ':' + (''+dn.getUTCSeconds()).padStart(2,'0')
    }
}
