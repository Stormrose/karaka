import Axios from "axios";
import { Facts, OracleCoingecko } from "../types/maintypes";
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('ORACLE-COINGECKO')

export async function gatherFacts(ocg: OracleCoingecko): Promise<Facts> {
    let facts: Facts = {}
    ocg.prefix = ocg.prefix ?? "cg"
    ocg.printsuppresspct = ocg.printsuppresspct ?? 0.5,
    ocg.params = ocg.params ?? {}
    const vs_currency: string = ocg.params.vs_currency ?? "usd"
    const ids: string[] = ocg.params.ids ?? [ "hive", "hive_dollar" ]

    try {
        const res: any = await Axios.get(
            "https://api.coingecko.com/api/v3/coins/markets"
            + "?vs_currency=" + vs_currency
            + "&ids=" + ids.join('%2C')
        )
        let json: any = res.data ?? "[]" 
        if(typeof json === 'string') json = JSON.stringify(json)
        if(typeof json !== 'object') {
            quietconsole.log("Coingecko API didn't return an object", "Coingecko API didn't return an object")
        } else {
            for(const ticker of json) {
                const symbol: string = (<string>(ticker.symbol ?? ticker.id ?? ticker.name ?? "WTF")).toUpperCase()
                const factname: string = ocg.prefix + symbol + vs_currency.toUpperCase()
                if(ticker.current_price > 0) {
                    facts[factname] = ticker.current_price
                    // quietconsole.log(factname + " = " + ticker.current_price, factname + " = " + ticker.current_price)
                    quietconsole.logNumericValue(factname, <number>facts[factname], ocg.printsuppresspct / 100)
                }
            }
        }
    } catch(e:any) {
        quietconsole.log(e.message, e.message)
    }

    return facts
}

/* 
https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=hive%2Chive_dollar
[
    {"id":"hive","symbol":"hive","name":"Hive","image":"https://assets.coingecko.com/coins/images/10840/large/logo_transparent_4x.png?1584623184","current_price":0.552451,"market_cap":204906869,"market_cap_rank":161,"fully_diluted_valuation":null,"total_volume":28028938,"high_24h":0.573357,"low_24h":0.540846,"price_change_24h":0.00605785,"price_change_percentage_24h":1.1087,"market_cap_change_24h":761823,"market_cap_change_percentage_24h":0.37318,"circulating_supply":371261453.714,"total_supply":null,"max_supply":null,"ath":3.41,"ath_change_percentage":-83.80711,"ath_date":"2021-11-26T01:46:11.175Z","atl":0.087309,"atl_change_percentage":532.0304,"atl_date":"2020-04-06T07:35:48.099Z","roi":null,"last_updated":"2022-09-16T06:10:47.955Z"},
    {"id":"hive_dollar","symbol":"hbd","name":"Hive Dollar","image":"https://assets.coingecko.com/coins/images/10855/large/w_q7vezk_400x400.jpg?1585551727","current_price":0.98186,"market_cap":0.0,"market_cap_rank":null,"fully_diluted_valuation":null,"total_volume":1886930,"high_24h":1.013,"low_24h":0.976929,"price_change_24h":-0.029516315200108445,"price_change_percentage_24h":-2.91843,"market_cap_change_24h":0.0,"market_cap_change_percentage_24h":0.0,"circulating_supply":0.0,"total_supply":null,"max_supply":null,"ath":3.97,"ath_change_percentage":-75.13435,"ath_date":"2021-02-01T02:39:07.394Z","atl":0.424305,"atl_change_percentage":132.93242,"atl_date":"2020-04-06T08:34:42.260Z","roi":null,"last_updated":"2022-09-16T06:10:36.600Z"}
]
*/
