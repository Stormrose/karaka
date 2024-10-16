import { Client as HiveClient, PrivateKey as HivePrivateKey } from '@hiveio/dhive'
import HiveEngine from 'sscjs'
import { CommandForExecution, Accounts, TransferCommand, HiveLikeAccount, StakeCommand, SellCommand, WarnCommand, AddLiquidityCommand, Facts } from "../types/maintypes"
import QuietConsole from './QuietConsole'

interface HiveEngineLikeTokenInfo {
    _id: number
    account: string
    symbol: string
    balance: string
    stake: string
    pendingUnstake: string
    delegationsIn: string
    delegationsOut: string
    pendingUndelegations: string
}
type HiveEngineLikeTokenInfos = HiveEngineLikeTokenInfo[]
const quietconsole: QuietConsole = new QuietConsole('HIVEENGINE')
let hiveengine: any

export async function gatherFacts(heaccounts: Accounts, _hiveapiclient: HiveClient, sidechainuri: string): Promise<Facts> {
    const hefacts: {[index: string]: string|number} = {}
    cachedPoolStats.clear()
    try {
        //@ts-ignore Not constructible
        hiveengine = new HiveEngine(sidechainuri)
        // console.log('HIVEENGINE: Gathering facts.')
        const heaccountnames: string[] = Object.keys(heaccounts)
        quietconsole.log('fetch', 'Fetching accounts @' + heaccountnames.join(', @'))
        for(const heaccountname of heaccountnames) {
            let heaccountdata = <HiveEngineLikeTokenInfos>(await hiveengine.find('tokens', 'balances', { account: heaccountname }))
            for(const tokeninfo of heaccountdata) {
                // hefacts[heaccountname] = JSON.stringify(heaccountdata)
                if(parseFloat(tokeninfo.balance) !== 0) hefacts[tokeninfo.account + '.' + tokeninfo.symbol + '_balance'] = parseFloat(tokeninfo.balance)
                if(parseFloat(tokeninfo.stake) !== 0) hefacts[tokeninfo.account + '.' + tokeninfo.symbol + '_stake'] = parseFloat(tokeninfo.stake)
                if(parseFloat(tokeninfo.pendingUnstake) !== 0) {
                    hefacts[tokeninfo.account + '.' + tokeninfo.symbol + '_unstaking'] = parseFloat(tokeninfo.stake)
                    hefacts[tokeninfo.account + '.' + tokeninfo.symbol + '_netstake'] = <number>hefacts[tokeninfo.account + '.' + tokeninfo.symbol + '_stake'] - <number>hefacts[tokeninfo.account + '.' + tokeninfo.symbol + '_unstaking']
                }
            }
            if(!(<HiveLikeAccount>heaccounts[heaccountname]).silent) quietconsole.log(
                'accountsummary_' + heaccountname,
                '@' + heaccountname + ': ' 
                + (hefacts?.[heaccountname + '.SWAP.HIVE_balance'] ?? '0') + ' SWAP.HIVE / ' 
                + (hefacts?.[heaccountname + '.SWAP.HBD_balance'] ?? '0') + ' SWAP.HBD / ' 
                + (hefacts?.[heaccountname + '.BEE_balance'] ?? '0') + ' BEE.'
            )
        }
    } catch(e:any) {
        quietconsole.log(e.message, e.message)
    }
    return hefacts
}

export async function executeCommand(cmd: CommandForExecution, orderid: number, accounts: Accounts, hiveapiclient: HiveClient, execute: boolean): Promise<void> {
    let wifa: HivePrivateKey
    let status: string = ''
    let retriable: boolean = true
    let cmdobj: any = {}

    { orderid; }

    switch(cmd.command.command) {
        case 'transfer':
            let tc: TransferCommand = <TransferCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                try {
                    status = 'Buidling transfer object.'
                    retriable = false
                    cmdobj = {
                        id: 'ssc-mainnet-hive',
                        required_auths: [ tc.from ],
                        required_posting_auths: [],
                        json: JSON.stringify({
                            contractName: "tokens", contractAction: "transfer", contractPayload: {
                                symbol: tc.assettype,
                                to: tc.to,
                                quantity: tc.amount,
                                memo: tc.memo
                        }})
                    }
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, tc.from)
                    //console.log('3: ', cmdobj)
                    status = 'Broadcasting transfer operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.json(cmdobj, wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'TRANSFER ' + tc.amount + ' ' + tc.assettype + ' from ' + tc.from + ' to ' + tc.to + 
                        (tc.memo ? ' with memo "' + tc.memo + '"' : '') +
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
                    cmdobj = {
                        id: 'ssc-mainnet-hive',
                        required_auths: [ sc.from ],
                        required_posting_auths: [],
                        json: JSON.stringify({
                            contractName: "tokens", contractAction: "stake", contractPayload: {
                                symbol: sc.assettype,
                                to: sc.to,
                                quantity: sc.amount,
                        }})
                    }
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, sc.from)
                    status = 'Broadcasting stake operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.json(cmdobj, wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'STAKE ' + sc.amount + ' ' + sc.assettype + ' from ' + sc.from + ' to ' + sc.to + '.'
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

        case 'sell':
            let mc: SellCommand = <SellCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                try {
                    status = 'Building sell object.'
                    retriable = false
                    orderid++
                    cmdobj = {
                        id: 'ssc-mainnet-hive',
                        required_auths: [ mc.from ],
                        required_posting_auths: [],
                        json: JSON.stringify({
                            contractName: "market", contractAction: "marketSell", contractPayload: {
                                symbol: mc.assettype,
                                quantity: mc.amount
                        }})
                    }
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, mc.from)
                    status = 'Broadcasting sell operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.json(cmdobj, wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'SELL ' + mc.amount + ' ' + mc.assettype + ' for ' + mc.toassettype + ' from ' + mc.from
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

        case 'buy':
            let bc: SellCommand = <SellCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                try {
                    status = 'Building buy object.'
                    retriable = false
                    orderid++
                    cmdobj = {
                        id: 'ssc-mainnet-hive',
                        required_auths: [ bc.from ],
                        required_posting_auths: [],
                        json: JSON.stringify({
                            contractName: "market", contractAction: "marketBuy", contractPayload: {
                                symbol: bc.toassettype,
                                quantity: bc.amount
                        }})
                    }
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, bc.from)
                    status = 'Broadcasting buy operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.json(cmdobj, wifa)
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'BUY ' + bc.toassettype + ' with ' + bc.amount + ' ' + bc.assettype + ' from ' + bc.from
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

        case 'warn':
            quietconsole.log(
                'WARN: ' + (<WarnCommand>cmd.command).message,
                'WARN: ' + (<WarnCommand>cmd.command).message
            )
            cmd.success = true
            break

        case 'deposit':
        case 'withdraw':
            quietconsole.log(
                'Command not supported: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command),
                'Command not supported: ' + cmd.command.command + " in \n\t" + cmd.name + "\n\t" + JSON.stringify(cmd.command)
            )
            cmd.retries = -1
            cmd.success = false
            break

        case 'addliquidity':
            let alc: AddLiquidityCommand = <AddLiquidityCommand>cmd.command
            while(!cmd.success && cmd.retries > 0 && retriable) {
                try {
                    status = 'Calculating quote quantity'
                    const quoteQuantityN = await calculateLiquidityQuoteQuantity(alc.topool, parseFloat(<string>(alc.amount)))
                    const quoteQuantity: string = quoteQuantityN.toFixed(5)
                    status = 'Building addliquidity object.'
                    retriable = false
                    orderid++
                    cmdobj = {
                        id: 'ssc-mainnet-hive',
                        required_auths: [ alc.from ],
                        required_posting_auths: [],
                        json: JSON.stringify({
                            contractName: "marketpools", contractAction: "addLiquidity", contractPayload: {
                                tokenPair: alc.topool,
                                baseQuantity: alc.amount,
                                quoteQuantity: quoteQuantity,
                                maxSlippage: "1",
                                maxDeviation: "0"
                        }})
                    }
                    status = 'Getting active key.'
                    wifa = getActiveKey(accounts, alc.from)
                    status = 'Broadcasting addliquidity operation.'
                    retriable = true
                    if(execute) await hiveapiclient.broadcast.json(cmdobj, wifa)
                    // console.log('EXECUTE: ' + JSON.stringify(cmdobj))
                    status = 'Logging success.'
                    retriable = false
                    quietconsole.log(
                        undefined,
                        (execute ? '' : 'EXECUTION-SUPPRESSED: ') +
                        'ADDLIQUIDITY ' + alc.amount + ' ' + alc.assettype + ' to ' + alc.topool + ' from ' + alc.from
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

const cachedPoolStats = new Map<string, Promise<any>>()
async function getPoolStats(poolname: string): Promise<any> {
  if (!hiveengine) return Promise.reject('No HiveEngine Connection established');

  // Check if a request for this pool is already in progress
  if (cachedPoolStats.has(poolname)) {
    return cachedPoolStats.get(poolname);
  }

  // If no request is in progress, create a new Promise and cache it
  const p = hiveengine.findOne('marketpools', 'pools', { "tokenPair": poolname.toUpperCase() })
  cachedPoolStats.set(poolname, p)
  const r = await p
  cachedPoolStats.set(poolname, r)
  return r
}

async function calculateLiquidityQuoteQuantity(poolname: string, baseAmount: number): Promise<number> {
    const ps = await getPoolStats(poolname)

    const reserveA = parseFloat(ps.baseQuantity)
    const reserveB = parseFloat(ps.quoteQuantity)
    const ratiobovera = reserveB / reserveA

    const quoteQuantity = (Math.trunc((ratiobovera * baseAmount) * 100000) / 100000) + 0.00001
    // console.log(`QQ: ${reserveA} / ${reserveB} = ${ratiobovera}`)
    // console.log(`QQ: ${quoteQuantity} = ${ratiobovera} * ${baseAmount}`)
    return Promise.resolve(quoteQuantity)
}