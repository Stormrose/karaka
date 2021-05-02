import { Client as HiveClient, PrivateKey as HivePrivateKey, Asset as HiveAsset, ExtendedAccount as HiveExtendedAccount } from '@hiveio/dhive'
import { CommandForExecution, Accounts, TransferCommand, WifKeys, StakeCommand, SellCommand, WarnCommand, Facts } from "../types/maintypes"
import QuietConsole from './QuietConsole'

const quietconsole: QuietConsole = new QuietConsole('HIVE')

export async function gatherFacts(hiveaccounts: Accounts, hiveapiclient: HiveClient): Promise<Facts> {
    // console.log('HIVE: Getting accounts and adding to fact pool.')
    const hiveaccountnames: string[] = Object.keys(hiveaccounts)
    quietconsole.log('fetch', 'Fetching accounts @' + hiveaccountnames.join(', @'))    
    let hiveaccountdata: HiveExtendedAccount[] = await hiveapiclient.database.getAccounts(hiveaccountnames)
    const hivefacts: {[index: string]: string|number|HiveAsset} = {}
    for(const account of hiveaccountdata) {
        hivefacts[account.name + '.' + 'hive_balance'] = parseFloat((<string>account.balance).split(' ')[0])
        hivefacts[account.name + '.' + 'hbd_balance'] = parseFloat((<string>account.hbd_balance).split(' ')[0])
        hivefacts[account.name + '.' + 'vesting_shares'] = parseFloat((<string>account.vesting_shares).split(' ')[0])
        hivefacts[account.name + '.' + 'reputation'] = parseFloat(<string>account.reputation)
        hivefacts[account.name + '.' + 'voting_power'] = account.voting_power
        quietconsole.log(
            'accountsummary_' + account.name,
            '@' + account.name + ': ' + account.balance + ', ' + account.hbd_balance
        )
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
                            fill_or_kill: true,
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
        default:
            console.log(
                'Command not recognised: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command),
                'Command not recognised: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command)
            )
            cmd.retries = -1
            cmd.success = false
    }
    return
}

function getActiveKey(accounts: Accounts, accountname: string): HivePrivateKey {
    return HivePrivateKey.fromString(<string>(<WifKeys>accounts[accountname]).wifa)
}