import { Asset as HiveAsset } from '@hiveio/dhive'

export type KarakaConfig = {
    intervalmins: number
    intervalrepeatmins: number
    oracles?: Oracles
    hive?: HiveLikeChain
    hiveengine?: HiveEngineLikeChain
    steem?: HiveLikeChain
    steemengine?: HiveEngineLikeChain
}
export interface HiveLikeChain {
    constants?: Facts
    imports?: ImportedFacts
    apinode: ApiNode
    accounts: Accounts
    rules: Rules
}
export interface HiveEngineLikeChain extends HiveLikeChain {
    sidechainuri: string
}
export type ApiNode = string | string[]
export type Accounts = {[index: string]: (WifActiveKey|HiveLikeAccount)}
export type WifKey = string
export type WifPostingKey = WifKey
export type WifActiveKey = WifKey
export type WifMemoKey = WifKey
export type HiveLikeAccount = {
    wifa: WifActiveKey
    wifp?: WifPostingKey
    wifm?: WifMemoKey
    from?: string
    silent?: boolean
}
export type ImportedFacts = ImportedFact[]
export type ImportedFact = {
    chain: "hive" | "hiveengine" | "steem" | "steemengine"
    from: string
    to?: string
}
export type Rules = Rule[]
export type Rule = {
    "if": Antecedent
    "then": Consequent
    _antecedent?: Function
    _consequent?: ParsedConsequent
    name?: string
    comment?: string
    foreach?: string[]
}
export type Antecedent = string
export type Consequent = ConsequentCommandString[]
export type ConsequentCommandString = string
export type ParsedConsequent = ConsequentCommand[]
export interface ConsequentCommand {
    command: string
    hassideeffects: boolean
}
export interface ConsequentCommandWithAmount extends ConsequentCommand {
    amount: string | Function
    assettype: string
    hassideeffects: true
}
export interface TransferCommand extends ConsequentCommandWithAmount {
    command: "transfer"
    to: string
    from: string
    memo?: string
}
export interface StakeCommand extends ConsequentCommandWithAmount {
    command: "stake"
    to: string
    from: string
}
export interface UnStakeCommand extends ConsequentCommandWithAmount {
    command: "unstake"
    from: string
}
export interface SellCommand extends ConsequentCommandWithAmount {
    command: "sell"
    from: string
    toassettype: string
    at: string
}
export interface BuyCommand extends ConsequentCommandWithAmount {
    command: "buy"
    from: string
    toassettype: string
    at: string
}
export interface DepositCommand extends ConsequentCommandWithAmount {
    command: "deposit"
    from: string
    to: string
    memo: string
}
export interface WithdrawCommand extends ConsequentCommandWithAmount {
    command: "withdraw"
    from: string
    to: string
    memo: string
}
export interface WarnCommand extends ConsequentCommand {
    command: "warn"
    message: string
    hassideeffects: false
}
export interface AddLiquidityCommand extends ConsequentCommandWithAmount {
    command: "addliquidity"
    topool: string
    from: string
}
export type CommandForExecutions = CommandForExecution[]
export interface CommandForExecution {
    name: string
    command: ConsequentCommand
    retries: number
    success: boolean
}
export type Facts = {[index: string]: string|number|HiveAsset}

export const DefaultTokenExchangeMap: { [index: string]: string } = {
    'HBD': 'HIVE',  'HIVE': 'HBD',
    'STEEM': 'SBD', 'SBD': 'STEEM'
}
export const DefaultTokenDecimals: { [index: string]: number } = {
    'HIVE': 3, 'HBD': 3,
    'STEEM': 3, 'SBD': 3,
    'BEE': 8, 'SWAP.HIVE': 3, 'SWAP.HBD': 3,  // SWAP.HIVE and SWAP.HBD are 3dp to reduce rounding errors on withdrawals
    'PAL': 3, 'LEO': 3, 'VIBES': 8,
    'ZING': 3, 'FISH': 3, 'CHIPS': 3
}
export const AssetToNai: {[index: string]: { [index: string]: number|string}} = {
    'HBD':  { 'nai': '@@000000013', 'precision': 3 },
    'HIVE': { 'nai': '@@000000021', 'precision': 3 }
}
export const NaiToAsset: {[index: string] : string} = {
    '@@000000013': 'HBD',
    '@@000000021': 'HIVE'
}
export interface OperationHiveAsset {
    amount: string
    precision: number
    nai: string
}
export type Oracles = Oracle[]
export interface Oracle {
    type: string
    prefix: string
    printsuppresspct: number
    params: OracleParameters
    comment?: string
}
export type OracleParameters = {[index: string]: any}
export interface OracleCoingecko extends Oracle {
    type: "coingecko",
    prefix: "cg",
    printsuppresspct: 0.5,
    params: OracleParametersCoingecko
}
type OracleParametersCoingecko = {
    "vs_currency": string
    "ids": string[]
}
export interface OracleHiveInternalMarket extends Oracle {
    type: "hiveinternal",
    prefix: "hv",
    printsuppresspct: 0.5,
    params: {}
}
export interface OracleHiveEngineOrderBook extends Oracle {
    type: "hiveengineorderbook",
    prefix: "heob",
    printsuppresspct: 0.5,
    params: OracleParametersHiveEngineOrderBook
}
type OracleParametersHiveEngineOrderBook = {
    sidechainuri: string,
    tokens: string[]
}
