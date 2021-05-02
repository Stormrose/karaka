import { Client as HiveClient } from '@hiveio/dhive'
import { KarakaConfig, Facts, CommandForExecutions, WifKeys } from "../types/maintypes"
import { getScheduleOfConsequentsToExecute } from "./getScheduleOfConsequentsToExecute"
import * as HiveHelper from './HiveHelper'
import * as HiveEngineHelper from './HiveEngineHelper'
import * as FactHelper from './FactHelper'
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('TICK')

export async function mainTick(config: KarakaConfig) {
    quietconsole.log(
        'tickstart',
        'mainTick() start.'
    )
    if(config.hive) {
        const hiveapiclient: HiveClient = new HiveClient(config.hive.apinode)

        // Gather facts
        let hivefacts: Facts = await HiveHelper.gatherFacts(config.hive.accounts, hiveapiclient)
        hivefacts = FactHelper.mergeFacts(hivefacts, config.hive.constants)
        // console.log('HIVE: Facts gathered, appplying rules.')

        // Gather schedule of commands to execute
        const hivecommandq: CommandForExecutions = getScheduleOfConsequentsToExecute(hivefacts, config.hive.rules, 'HIVE', true)
        if(hivecommandq.length === 0) quietconsole.log('hivenorulesmatched', 'HIVE: No rules matched.')
        // console.log(hivecommandq)

        // Execute the schedule
        for(const cmd of hivecommandq) {
            orderid++
            await HiveHelper.executeCommand(cmd, orderid, config.hive.accounts, hiveapiclient, true)
        }
        // Report
    }
    // { HiveHelper; orderid; }

    if(config.hiveengine) {
        // Use api-node from Hive, if specifics aren't declared for hive-engine
        config.hiveengine.apinode = config.hiveengine.apinode ?? config.hive?.apinode ?? "https://api.hive.blog"
        const hiveapiclient: HiveClient = new HiveClient(config.hiveengine.apinode)

        // Check if accounts
        for(const accountname of Object.keys(config.hiveengine.accounts)) {
            let account: WifKeys = <WifKeys>config.hiveengine.accounts[accountname]
            if(account.from) {
                //@ts-ignore Can't use account.from to index config
                config.hiveengine.accounts[accountname] = config[account.from].accounts[accountname]
            }
        }

        // Gather facts
        let hiveenginefacts: Facts = await HiveEngineHelper.gatherFacts(config.hiveengine.accounts, hiveapiclient, config.hiveengine.sidechainuri)
        hiveenginefacts = FactHelper.mergeFacts(hiveenginefacts, config.hiveengine.constants)
        // console.log(hiveenginefacts)
        // console.log('HIVEENGINE: Facts gathered, appplying rules.')

        // Gather schedule of commands to execute
        const hiveenginecommandq: CommandForExecutions = getScheduleOfConsequentsToExecute(hiveenginefacts, config.hiveengine.rules, 'HIVEENGINE', true)
        if(hiveenginecommandq.length === 0) quietconsole.log('hiveenginenorulesmatched', 'HIVEENGINE: No rules matched.')
        // console.log(hiveenginecommandq)

        // Execute the schedule
        for(const cmd of hiveenginecommandq) {
            await HiveEngineHelper.executeCommand(cmd, 0, config.hiveengine.accounts, hiveapiclient, true)
        }
        // Report

        quietconsole.log(
            'tickend',
            'mainTick() end.'
        )
    }
}

let orderid: number = 1000;
export function primeOrderId() {
    orderid = Math.trunc(Math.random() * 1000)
}
