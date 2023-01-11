// Reduce the frequency of repeated console messages
let linecounter: number = 0 //TODO linecounter should be shared amongst all - shouldn't be private by module

export default class QuietConsole  {
    private cache: QuietConsoleCache = {}
    private numericvaluecache: QuietConsoleFactCache = {}

    constructor(private prefix: string = '', readonly linesbetweenrepeats: number = 80) {}

    public log(label: string|undefined, text: string): void {
        if(!label) return this.logWithDateAndPrefix(text)

        const cacheitem: QuietConsoleCacheItem = this.cache[label] ?? {
            text: '',
            lastprinted: new Date(0),
            linecounter: 0
        }

        if(cacheitem.text !== text) return this.logAndCache(label, text)
        if(cacheitem.lastprinted.toDateString() !== (new Date()).toDateString()) return this.logAndCache(label, text)
        if(cacheitem.linecounter + this.linesbetweenrepeats < linecounter) return this.logAndCache(label, text)

        this.cache[label] = cacheitem
        return
    }

    public logNumericValue(name: string, value: number, range: number): void {
        const cacheitem: QuietConsoleFactCacheItem = this.numericvaluecache[name] ?? {
            text: '', 
            lastprinted: new Date(0), 
            linecounter: 0,
            lastvalue: value * 2
        }

        if(cacheitem.text === '') return this.logAndCacheNumericValue(name, value)
        if(cacheitem.lastprinted.toDateString() !== (new Date()).toDateString()) return this.logAndCacheNumericValue(name, value)
        if(cacheitem.linecounter + this.linesbetweenrepeats < linecounter) return this.logAndCacheNumericValue(name, value)
        if(Math.abs(1 - (cacheitem.lastvalue / value)) >= range) {
            // console.log('        Printing this numeric value:', name, '=', value.toFixed(6), '(' + cacheitem.lastvalue.toFixed(6), '' + (Math.abs(1 - (cacheitem.lastvalue / value)) * 100).toFixed(2) + '%)')
            return this.logAndCacheNumericValue(name, value)
        } else if(Math.abs(1 - (cacheitem.lastvalue / value)) < range) {
            // console.log('Skipped printing this numeric value:', name, '=', value.toFixed(6), '(' + cacheitem.lastvalue.toFixed(6), '' + (Math.abs(1 - (cacheitem.lastvalue / value)) * 100).toFixed(2) + '%)')
        }

        this.numericvaluecache[name] = cacheitem
        return
    }

    private logAndCache(label: string, text: string): void {
        this.cache[label] = {
            text,
            lastprinted: new Date(),
            linecounter: linecounter
        }
        return this.logWithDateAndPrefix(text)
    }

    private logAndCacheNumericValue(name: string, value: number): void {
        const text: string = name + '=' + value
        this.numericvaluecache[name] = {
            text,
            lastprinted: new Date(),
            linecounter: linecounter,
            lastvalue: value
        }

        return this.logWithDateAndPrefix(text)
    }

    private logWithDateAndPrefix(text: string): void {
        console.log(
            this.getLogDateTime() + ' ' +
            (this.prefix ? this.prefix + ': ' : '') +
            text
        )
        linecounter++
    }

    private getLogDateTime(): string {
        const dn: Date = new Date()
        return dn.getUTCFullYear() + '-' + (''+(dn.getUTCMonth() + 1)).padStart(2,'0') + '-' + (''+dn.getUTCDate()).padStart(2,'0') + ' ' +
            (''+dn.getUTCHours()).padStart(2,'0') + ":" + (''+dn.getUTCMinutes()).padStart(2,'0') + ':' + (''+dn.getUTCSeconds()).padStart(2,'0')
    }
}

type QuietConsoleCache =  {[index: string]: QuietConsoleCacheItem }
interface QuietConsoleCacheItem {
    text: string
    lastprinted: Date
    linecounter: number
}

type QuietConsoleFactCache = {[index: string]: QuietConsoleFactCacheItem}
interface QuietConsoleFactCacheItem extends QuietConsoleCacheItem {
    lastvalue: number
}
