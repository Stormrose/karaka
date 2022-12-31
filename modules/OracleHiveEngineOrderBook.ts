import HiveEngine from 'sscjs'
import { Facts, OracleHiveEngineOrderBook } from "../types/maintypes"
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('ORACLE-HIVEENGINEORDERBOOK')

export async function gatherFacts(oheob: OracleHiveEngineOrderBook): Promise<Facts> {
    let facts: Facts = {}
    oheob.prefix = oheob.prefix ?? "hem"
    oheob.params = oheob.params ?? {}
    oheob.params.sidechainuri = oheob.params.sidechainuri ?? "https://api.hive-engine.com/rpc"
    oheob.params.tokens = oheob.params.tokens ?? []
    oheob.params.tokens = typeof oheob.params.tokens === "string" ? [ oheob.params.tokens ] : oheob.params.tokens
    const he = new HiveEngine(oheob.params.sidechainuri)

    for(let i of oheob.params.tokens) {
        const hres = await he.findOne('market', 'metrics', { symbol: i})
        if(hres.lastPrice) facts[oheob.prefix + i + '_price'] = parseFloat(hres.lastPrice)
        if(hres.lowestAsk) facts[oheob.prefix + i + '_ask'] = parseFloat(hres.lowestAsk)
        if(hres.highestBid) facts[oheob.prefix + i + '_bid'] = parseFloat(hres.highestBid)
    }
    for(const f in facts) quietconsole.log(f,  f + '=' + facts[f])
    return facts
}
