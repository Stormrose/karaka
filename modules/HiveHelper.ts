import { Client as HiveClient, PrivateKey as HivePrivateKey, Asset as HiveAsset, ExtendedAccount as HiveExtendedAccount } from '@hiveio/dhive'
import { CommandForExecution, Accounts, TransferCommand, HiveLikeAccount, StakeCommand, SellCommand, DepositCommand, WarnCommand, Facts } from "../types/maintypes"
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('HIVE')

export async function gatherFacts(hiveaccounts: Accounts, hiveapiclient: HiveClient): Promise<Facts> {
    const hivefacts: {[index: string]: string|number|HiveAsset} = {}
    const hiveaccountnames: string[] = Object.keys(hiveaccounts)
    let hiveaccountdata: HiveExtendedAccount[] = []

    for(let i = 0; i < hiveaccountnames.length; i += 5) {
        const batch = hiveaccountnames.slice(i, i + 5)
        quietconsole.log('fetch' + batch.join(', @'), 'Fetching accounts @' + batch.join(', @')) 
        try {
            const hiveaccountdatas: HiveExtendedAccount[] = await hiveapiclient.database.getAccounts(batch)
            hiveaccountdata = [ ...hiveaccountdata, ...hiveaccountdatas ]
        } catch(e:any) {
            quietconsole.log(batch.join(', @') + e.message, 'Fetch ERROR' + batch.join(', @') + e.message)
        }    
    }
    for(const account of hiveaccountdata) {
        try {
            hivefacts[account.name + '.' + 'hive_balance'] = parseFloat((<string>account.balance).split(' ')[0])
            hivefacts[account.name + '.' + 'hbd_balance'] = parseFloat((<string>account.hbd_balance).split(' ')[0])
            hivefacts[account.name + '.' + 'vesting_shares'] = parseFloat((<string>account.vesting_shares).split(' ')[0])
            hivefacts[account.name + '.' + 'hive_savings'] = parseFloat((<string>account.savings_balance).split(' ')[0])
            hivefacts[account.name + '.' + 'hbd_savings'] = parseFloat((<string>account.savings_hbd_balance).split(' ')[0])
            hivefacts[account.name + '.' + 'reputation'] = parseFloat(<string>account.reputation)
            hivefacts[account.name + '.' + 'voting_power'] = account.voting_power
            if(!(<HiveLikeAccount>hiveaccounts[account.name]).silent) {
                quietconsole.log(
                    'accountsummary_' + account.name,
                    '@' + account.name + ': ' + account.balance + ', ' + account.hbd_balance
                )
            }
        } catch(e:any) {
            quietconsole.log(account.name ?? '' + ' ' + e.message, "ERROR: HiveHelper, fact for " + account.name ?? '' + ': ' + e.message)
        }
    }
    return hivefacts
}

export async function executeCommand(cmd: CommandForExecution, orderid: number, accounts: Accounts, hiveapiclient: HiveClient, execute: boolean): Promise<void> {
    let wifa: HivePrivateKey
    let status: string = ''
    let retriable: boolean = true
    let op: any = []
    switch(cmd.command.command) {
        case 'transfer':
            let tc: TransferCommand = <TransferCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                let cmdobj: any = {}
                try {
                    status = 'Buidling transfer object.'
                    retriable = false
                    let cmdobj: any = {
                        from: tc.from,
                        to: tc.to,
                        amount: tc.amount + ' ' + tc.assettype,
                        memo: tc.memo ? tc.memo : ''
                    }
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, tc.from)
                    //console.log('3: ', cmdobj)
                    status = 'Broadcasting transfer operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.transfer(cmdobj, wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'TRANSFER ' + cmdobj.amount + ' from ' + cmdobj.from + ' to ' + cmdobj.to + 
                        (cmdobj.memo ? ' with memo "' + cmdobj.memo +'"': '') +
                        '.'
                    )
                    cmd.success = true
                } catch(e){
                    console.log('Command failed: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command))
                    console.log('\t' + JSON.stringify(cmdobj))
                    console.log('STATUS: ' + status)
                    console.log(e)
                    if(retriable) console.log(cmd.retries + ' retries remain.')
                    else console.log('Will not retry.')
                    cmd.retries--
                }
            }
            break

        case 'stake':
            let sc: StakeCommand = <StakeCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                try {
                    status = 'Buidling staking object.'
                    retriable = false
                    op = [
                        'transfer_to_vesting',
                        {
                            from: sc.from,
                            to: sc.to,
                            amount: sc.amount + ' ' + sc.assettype
                        }
                    ]
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, sc.from)
                    status = 'Broadcasting stake operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.sendOperations([ op ], wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'STAKE ' + op[1].amount + ' from ' + op[1].from + ' to ' + op[1].to + '.'
                    )
                    cmd.success = true
                } catch(e){
                    console.log('Command failed: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command))
                    console.log('\t' + JSON.stringify(op))
                    console.log('STATUS: ' + status)
                    console.log(e)
                    if(retriable) console.log(cmd.retries + ' retries remain.')
                    else console.log('Will not retry.')
                    cmd.retries--
                }
            }
            break

        case 'sell':
            let mc: SellCommand = <SellCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                try {
                    status = 'Buidling sell object.'
                    retriable = false
                    orderid++
                    op = [
                        'limit_order_create',
                        {
                            owner: mc.from,
                            orderid,
                            amount_to_sell: mc.amount + ' ' + mc.assettype,
                            // amount_to_sell: { amount: mc.amount, ...AssetToNai[mc.assettype] },
                            min_to_receive: '0.001 ' + mc.toassettype,
                            // min_to_receive: { amount: '0.001', ...AssetToNai[mc.toassettype] },
                            fill_or_kill: false,
                            expiration: (new Date(Date.now() + (17 * 1000))).toISOString().substring(0,19)
                        }
                    ]
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, mc.from)
                    status = 'Broadcasting sell operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.sendOperations([ op ], wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'SELL ' + op[1].amount_to_sell + ' from ' + op[1].owner
                    )
                    cmd.success = true
                } catch(e){
                    console.log('Command failed: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command))
                    console.log('\t' + JSON.stringify(op))
                    console.log('STATUS: ' + status)
                    console.log(e)
                    if(retriable) console.log(cmd.retries + ' retries remain.')
                    else console.log('Will not retry.')
                    cmd.retries--
                }
            }
            break

        case 'deposit':
            let dc: DepositCommand = <DepositCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                try {
                    status = 'Buidling deposit object.'
                    retriable = false
                    op = [
                        'transfer_to_savings',
                        {
                            to: dc.to,
                            from: dc.from,
                            amount: dc.amount + ' ' + dc.assettype,
                            // amount: AmountAndAssetStringToObject(dc.amount, dc.assettype),
                            memo: dc.memo
                        }
                    ]
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, dc.from)
                    status = 'Broadcasting deposit operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.sendOperations([ op ], wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'DEPOSIT ' + op[1].amount + ' from ' + op[1].from + ' to ' + op[1].to
                    )
                    cmd.success = true
                } catch(e){
                    console.log('Command failed: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command))
                    console.log('\t' + JSON.stringify(op))
                    console.log('STATUS: ' + status)
                    console.log(e)
                    if(retriable) console.log(cmd.retries + ' retries remain.')
                    else console.log('Will not retry.')
                    cmd.retries--
                }
            }
            break

        case 'warn':
            // console.log(cmd.command)
            quietconsole.log(
                'WARN: ' + (<WarnCommand>cmd.command).message,
                'WARN: ' + (<WarnCommand>cmd.command).message
            )
            cmd.success = true
            break

        case 'buy':
        case 'withdraw':
            quietconsole.log(
                'Command not supported: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command),
                'Command not supported: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command)
            )
            cmd.retries = -1
            cmd.success = false
            break

        default:
            quietconsole.log(
                'Command not recognised: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command),
                'Command not recognised: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command)
            )
            cmd.retries = -1
            cmd.success = false
    }
    return
}

function getActiveKey(accounts: Accounts, accountname: string): HivePrivateKey {
    return HivePrivateKey.fromString(<string>(<HiveLikeAccount>accounts[accountname]).wifa)
}

// function AmountAndAssetStringToObject(amount: any, assetstr: string): OperationHiveAsset {
//     return <OperationHiveAsset>{ amount, ...AssetToNai[assetstr] }
// }
