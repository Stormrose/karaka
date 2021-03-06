import { Client as HiveClient } from '@hiveio/dhive'
import { KarakaConfig, Facts, CommandForExecutions, WifKeys } from "../types/maintypes"
import { getScheduleOfConsequentsToExecute } from "./getScheduleOfConsequentsToExecute"
import * as HiveHelper from './HiveHelper'
import * as HiveEngineHelper from './HiveEngineHelper'
import * as FactHelper from './FactHelper'
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('TICK')

export async function mainTick(config: KarakaConfig): Promise<boolean> {
    let r: boolean = false
    quietconsole.log(
        'tickstart',
        'mainTick() start.'
    )

    // Create connections
    let hiveapiclient: HiveClient = new HiveClient(config.hive?.apinode ?? "https://api.hive.blog")
    let hehiveapiclient: HiveClient = hiveapiclient

    if(config.hiveengine) {
        config.hiveengine.apinode = config.hiveengine.apinode ?? config.hive?.apinode ?? "https://api.hive.blog"
        hehiveapiclient = new HiveClient(config.hiveengine.apinode)

        // Check if accounts
        for(const accountname of Object.keys(config.hiveengine.accounts)) {
            let account: WifKeys = <WifKeys>config.hiveengine.accounts[accountname]
            if(account.from) {
                //@ts-ignore Can't use account.from to index config
                config.hiveengine.accounts[accountname] = config[account.from].accounts[accountname]
            }
        }
    }

    // Gather facts
    let hivefacts: Facts = {}
    let hiveenginefacts: Facts = {}

    if(config.hive) {
        hivefacts = await HiveHelper.gatherFacts(config.hive.accounts, hiveapiclient)
        hivefacts = FactHelper.mergeFacts(hivefacts, config.hive.constants)
    }
    if(config.hiveengine) {
        hiveenginefacts = await HiveEngineHelper.gatherFacts(config.hiveengine.accounts, hehiveapiclient, config.hiveengine.sidechainuri)
        hiveenginefacts = FactHelper.mergeFacts(hiveenginefacts, config.hiveengine.constants)
    }

    // Gather schedule of commands to execute
    let hivecommandq: CommandForExecutions = []
    let hiveenginecommandq: CommandForExecutions = []

    if(config.hive) {
        hivecommandq = getScheduleOfConsequentsToExecute(hivefacts, config.hive.rules, 'HIVE', true)
        if(hivecommandq.length === 0) quietconsole.log('hivenorulesmatched', 'HIVE: No rules matched.')        
    }
    if(config.hiveengine) {
        hiveenginecommandq = getScheduleOfConsequentsToExecute(hiveenginefacts, config.hiveengine.rules, 'HIVEENGINE', true)
        if(hiveenginecommandq.length === 0) quietconsole.log('hiveenginenorulesmatched', 'HIVEENGINE: No rules matched.')
    }

    // Execute the schedule
    if(config.hive) {
        for(const cmd of hivecommandq) {
            orderid++
            await HiveHelper.executeCommand(cmd, orderid, config.hive.accounts, hiveapiclient, true)
            r = r || cmd.command.hassideeffects
        }        
    }
    if(config.hiveengine) {
        for(const cmd of hiveenginecommandq) {
            await HiveEngineHelper.executeCommand(cmd, 0, config.hiveengine.accounts, hehiveapiclient, true)
            r = r || cmd.command.hassideeffects
        }
    }

    quietconsole.log(
        'tickend',
        'mainTick() end.'
    )
    return Promise.resolve(r)
}

let orderid: number = 1000;
export function primeOrderId() {
    orderid = Math.trunc(Math.random() * 1000)
}
