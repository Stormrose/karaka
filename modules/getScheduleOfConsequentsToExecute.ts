import { CommandForExecution, CommandForExecutions, ConsequentCommandWithAmount, DefaultTokenDecimals, Facts, Rules } from "../types/maintypes"

export function getScheduleOfConsequentsToExecute(facts: Facts, rules: Rules, reportprefix: string, report: boolean): CommandForExecutions {
    const schedule: CommandForExecution[] = []
    for(const r of rules) {
        let re = r._antecedent ? r._antecedent(facts) : undefined
        if(re === 1) {
            if(report) console.log(reportprefix + ': ' + 'Rule "' + r.name + '" matched.')
            if(r._consequent) {
                for(const cmd of r._consequent) {
                    if((<ConsequentCommandWithAmount>cmd).amount) {
                        let cmda: ConsequentCommandWithAmount = { ...(<ConsequentCommandWithAmount>cmd) }
                        let decimalplaces: number = DefaultTokenDecimals[cmda.assettype] ?? 3
                        let decimalsmultiplier: number = Math.pow(10, decimalplaces)
                        if(typeof cmda.amount === 'function') {
                            cmda.amount = cmda.amount(facts)
                        }
                        cmda.amount = Number(Math.floor(parseFloat(<string>cmda.amount) * decimalsmultiplier) / decimalsmultiplier).toFixed(decimalplaces)
                        schedule.push({
                            name: (r.name ? r.name : r['if']) + ' -> ' + JSON.stringify(cmda),
                            command: cmda,
                            retries: 3,
                            success: false
                        })
                    } else {
                        schedule.push({
                            name: (r.name ? r.name : r['if']) + ' -> ' + JSON.stringify(cmd),
                            command: cmd,
                            retries: 3,
                            success: false
                        })
                    }
                }
            }
        }
    }
    return schedule
}
