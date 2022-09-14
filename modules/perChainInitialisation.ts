import { Accounts, HiveLikeChain, Rules, Rule } from '../types/maintypes';
import compileExpression from './filtrex'
import { parseConsequentCommand } from './parseConsequentCommand'

// All functions in this module have side-effects: that is, they alter the object passed to them

export function perChainInitialisation(chain: HiveLikeChain): void {
    if (!chain) return
    standardiseKeys(chain.accounts)
    chain.rules = prepareRules(chain.rules)
}

function standardiseKeys(accounts: Accounts): void {
    // For each account...
    for (const accountname of Object.keys(accounts)) {
        // If the account value is a string, then assume it's an active key
        if(typeof accounts[accountname] === 'string') 
            accounts[accountname] = { wifa: <string>accounts[accountname] }
    }
}

function prepareRules(rules: Rules): Rules {
    let rules2: Rules = []

    for (const rule of rules) {
        //  If the consequent is a string, then standardise it into a single item array
        if(typeof rule.then === 'string') rule.then = [ rule.then ]
        
        // Examine each rule, looking for foreachs
        if(rule.foreach) {
            // Rule contains a foreach so expand into multiple rules
            for(const t of rule.foreach) {
                let rule2: Rule = { 
                    name: rule.name ? stringFormat(rule.name, [t]) : undefined,
                    comment: rule.comment ? stringFormat(rule.comment, [t]) : undefined,
                    "if": stringFormat(rule.if, [t]),
                    "then": []
                }
                for(const c of rule.then) {
                    rule2.then.push(stringFormat(c, [t]))
                }
                rules2.push(rule2)
                // console.log(rule2)
            }
        } else {
            // No foreach in the rules, pass it on
            rules2.push(rule)
        }
    }
    
    for(let rule of rules2) {
        rule = prepareRule(rule)
    }

    return rules2
}


function prepareRule(rule: Rule): Rule {
    rule._antecedent = compileExpression(rule.if)

    // Parse the consequent commands
    rule._consequent = []
    for (const consequentcommand of rule.then) {
        rule._consequent.push(parseConsequentCommand(consequentcommand))
    }

    // Give the rule a default name, if it lacks one
    rule.name = rule.name ?? rule.if

    return rule   
}

// Format string
function stringFormat(s: string, p: string[]): string {
    let s1: string = s

    // use replace to iterate over the string select the match and check if the related argument is present if yes, replace the match with the argument
    return s1.replace(/{([0-9]+)}/g, function (match, index) {
        // check if the argument is present
        return typeof p[index] == 'undefined' ? match : p[index]
    })
    return s1
}
