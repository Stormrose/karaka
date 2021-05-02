import { Accounts, HiveLikeChain, Rules } from '../types/maintypes';
import compileExpression from './filtrex'
import { parseConsequentCommand } from './parseConsequentCommand'

// All functions in this module have side-effects: that is, they alter the object passed to them

export function perChainInitialisation(chain: HiveLikeChain): void {
    if (!chain) return
    standardiseKeys(chain.accounts)
    prepareRules(chain.rules)
}

function standardiseKeys(accounts: Accounts): void {
    // For each account...
    for (const accountname of Object.keys(accounts)) {
        // If the account value is a string, then assume it's an active key
        if(typeof accounts[accountname] === 'string') 
            accounts[accountname] = { wifa: <string>accounts[accountname] }
    }
}

function prepareRules(rules: Rules): void {
    for (const rule of rules) {
        rule._antecedent = compileExpression(rule.if)

        // If the consequent is a string, then standardise it into an string array
        if (typeof rule.then === 'string') rule.then = [ rule.then ]

        // Parse the consequent commands
        rule._consequent = []
        for (const consequentcommand of rule.then) {
            rule._consequent.push(parseConsequentCommand(consequentcommand))
        }

        // Give the rule a default name, if it lacks one
        rule.name = rule.name ?? rule.if
    }
}
