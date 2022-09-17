import { Client as HiveClient } from '@hiveio/dhive'
import { Facts, Oracles, OracleCoingecko, OracleHiveInternalMarket } from "../types/maintypes"
import { mergeFacts } from "./FactHelper"
import { gatherFacts as Coingecko_gatherFacts } from "./OracleCoingeckoHelper"
import { gatherFacts as HiveInternal_gatherFacts } from "./OracleHiveInternalMarket"
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('ORACLES')

export async function gatherFacts(oracles: Oracles, hiveapi: HiveClient): Promise<Facts> {
    let facts: Facts = {}
    for(const o of oracles) {
        if(o.type && o.type === "coingecko") {
            let newfacts: Facts = await Coingecko_gatherFacts(<OracleCoingecko>o)
            facts = mergeFacts(facts, newfacts)
        } else if(o.type === "hiveinternal") {
            let newfacts: Facts = await HiveInternal_gatherFacts(<OracleHiveInternalMarket>o, hiveapi)
            facts = mergeFacts(facts, newfacts)
        } else {
            quietconsole.log(JSON.stringify(o), "Unknown oracle: " + JSON.stringify(o))
        }
    }
    return facts
}

// In main ticks
// 1. Add a call to this guy, passing the config, to gather the facts
// 2. Automatically import all oracle facts into each chain's factbase
