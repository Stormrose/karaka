import compileExpression from "./filtrex"
import { BuyCommand, ConsequentCommand, ConsequentCommandString, DefaultTokenExchangeMap, SellCommand, StakeCommand, TransferCommand, WarnCommand } from "../types/maintypes"

export function parseConsequentCommand(c: ConsequentCommandString): ConsequentCommand {

    // Tokenise
    let tokens1: string[] = c.split(' ')

    // Stitch expressions back together again
    let tokens2: string[] = []
    let parencount: number = 0
    let expression: string = ''

    // Collapse tokens that are enclosed in parentheses
    for(const t of tokens1) {
        if(parencount === 0) {
            if(!t.startsWith('(')) {
                tokens2.push(t)
            } else {
                if(t.endsWith(')')) {
                    tokens2.push(t)
                } else {
                    while(t.charAt(parencount) === '(') parencount++
                    expression = t
                }
            }
        } else if(!t.endsWith(')')) {
            if(t.startsWith('(')) {
                parencount++
            }
            expression = expression + ' ' + t
        } else {
            parencount--
            if(parencount !== 0) {
                expression = expression + ' ' + t
            } else {
                expression = expression + ' ' + t
                tokens2.push(expression)
            }
        }
    }

    // Lex the tokens
    let tidx: number = 0
    let command: string = tokens2[tidx]
    let amount: string | Function = ''
    let assettype: string = ''
    tidx++
    if(command !== 'warn') {
        try {
            if(tokens2[tidx] === 'amount') tidx++
            amount = tokens2[tidx].startsWith('(') ? compileExpression(tokens2[tidx]) : tokens2[tidx]
            tidx++
            assettype = tokens2[tidx].toUpperCase()
            tidx++
        } catch(e) {
            console.log('ERROR Parsing amount in rule-consequent.')
            console.log('CONSEQUENT: ' + c)
            console.log(e)
            process.exit(-1)
        }
    }
    let to: string = ''
    let from: string = ''
    let memo: string = ''
    let toassettype = ''
    let at = ''
    while(tidx < tokens2.length) {
        switch(tokens2[tidx]) {
            case 'to':
                tidx++
                to = tokens2[tidx]
                if(to.startsWith("'") && to.endsWith("'")) to = to.slice(1,-1)
                break

            case 'from':
                tidx++
                from = tokens2[tidx]
                if(from.startsWith("'") && from.endsWith("'")) from = from.slice(1,-1)
                break

            case 'memo':
            case 'message':
                tidx++
                memo = memo + ' ' + tokens2[tidx].substr(1, tokens2[tidx].length)
                while(tidx < tokens2.length - 1 && !tokens2[tidx].endsWith('"')) {
                    tidx++
                    memo = memo + ' ' + tokens2[tidx]
                }
                memo = memo.substr(0, memo.length - 1).trim()
                break

            case 'for':
            case 'of':
                tidx++
                toassettype = tokens2[tidx].toUpperCase()
                break

            case 'at':
                tidx++
                at = tokens2[tidx]
                break

            default:
                console.log('Unknown token "' + tokens2[tidx] + '" in rule then section. Fix the config.')
                console.log('RULE-then: ' + c)
                process.exit(-1)
            }
        tidx++
    }

    // Build the ConsequentCommand
    let r: ConsequentCommand = { command:'unknown' }
    switch(command) {
        case 'transfer':
            if(memo !== '') {
                r = <TransferCommand>{ command, amount, assettype, to, from, memo }
            } else {
                r = <TransferCommand>{ command, amount, assettype, to, from }
            }
            break

            case 'stake':
                from = from === '' ? to : from
                to = to === '' ? from : to
                if(to !== '') r = <StakeCommand>{ command, amount, assettype, to, from }
                // else defaults to unknown TODO consider throwing an error
                break

            case 'sell':
                toassettype = toassettype === '' ? DefaultTokenExchangeMap[assettype] : toassettype
                r = <SellCommand>{ command, amount, assettype, from, toassettype, at }
                break

            case 'buy':
                if(toassettype === '') {
                    console.log('ERROR HIVEENGINE: buy commands need a target asset')
                    console.log(c)
                    process.exit(-1)
                }
                if(assettype !== 'SWAP.HIVE') {
                    console.log('ERROR HIVEENGINE: buy commands need an amount specified in SWAP.HIVE')
                    console.log(c)
                    process.exit(-1)
                }
                r = <BuyCommand>{ command, amount, assettype, from, toassettype, at }
                break

            // case 'withdraw':
            //     from = from === '' ? to : from
            //     if(from !== '') r = <WithdrawCommand>{ command, amount, assettype, from }
            //     // else defaults to unknown TODO consider throwing an error
            //     break

            case 'warn':
                r = <WarnCommand>{ command, message: memo }
                break

            default:
                console.log('UNKNOWN COMMAND: "' + command + '". In rule then section. Fix the config.')
                console.log('RULE-then: ' + c)
                break
        }

    // Output some debug
    //console.log(c)
    //console.log(tokens1.join(' :: '))
    //console.log(tokens2.join(' :: '))
    //console.log(JSON.stringify(r) + "\n")

    return <ConsequentCommand>r
}
