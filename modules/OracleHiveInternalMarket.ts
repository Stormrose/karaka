import { Client as HiveClient } from '@hiveio/dhive' 
import { Facts, OracleHiveInternalMarket } from "../types/maintypes"
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('ORACLE-HIVEINTERNAL')

export async function gatherFacts(ohv: OracleHiveInternalMarket, hiveapi: HiveClient): Promise<Facts> {
    let facts: Facts = {}
    ohv.prefix = ohv.prefix ?? "hv"
    ohv.printsuppresspct = ohv.printsuppresspct ?? 0.5,
    ohv.params = ohv.params ?? {}

    const res:any = await hiveapi.call('market_history_api', 'get_ticker', {})
    if(res) {
        const symbolh2d: string = ohv.prefix + 'HIVEHBD'
        const symbold2h: string = ohv.prefix + 'HBDHIVE'
        if(res.latest) {
            facts[symbolh2d] = parseFloat(res.latest)
            facts[symbold2h] = 1 / parseFloat(res.latest)
        }
        if(res.lowest_ask) facts[symbolh2d + '_ask'] = parseFloat(res.lowest_ask)
        if(res.highest_bid) facts[symbolh2d + '_bid'] = parseFloat(res.highest_bid)
    }
    for(const f in facts) quietconsole.logNumericValue(f, <number>facts[f], ohv.printsuppresspct / 100)
    return facts
}

/* 
curl -s --data '{"jsonrpc":"2.0", "method":"market_history_api.get_ticker", "id":1}' https://api.hive.blog
{"latest":"0.54480286738351258","lowest_ask":"0.55501813784764209","highest_bid":"0.55372673711774056",
"percent_change":"0.00000000000000000","hive_volume":{"amount":"115195536","precision":3,"nai":"@@000000021"},
"hbd_volume":{"amount":"62992879","precision":3,"nai":"@@000000013"}}
*/
