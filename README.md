# Karaka
Automation (clerk) for Hive and Hive-Engine blockchains.
*Karaka is a Maori word meaning variously: an English loanword for 'clerk' or 'clock' and a significant coastal plant 'Corynocarpus laevigatus'.*

## Disclaimers
Preview release code. Use with caution. There is minimal error checking, and it's easy to send your tokens someplace irrecoverable. Always test with small amounts. There are likely bugs.
WARNING: If a command errors, it will be retried up to three times and then aborted. Retries make this program unsuitable for use in a splitter contract where all transactions must succeed or fail.

## Usage
`node dist/index.js`

## Installing
Requires node js. In the project folder:

`npm install -g typescript`
`npm install`
`tsc`

Then create a `config.json` file for your specific needs.

## config.json file
The program takes its instructions from a file named `config.json`. Look at the `config_example.json` file and build your own. The rules are somewhat human-readable.

## Concepts
For each supported blockchain, the program gathers *facts* about listed accounts and then checks these facts against the `if` clause of supplied rules. Matched rules have the *commands* in their `then` clauses executed.

An example rule:
`{ "if": "'msp-makeaminnow.hive_balance' > 0.100", `
`  "then": "stake ('msp-makeaminnow.hive_balance') HIVE from 'msp-makeaminnow'" }`

The `if` clauses contains a conditional statement. In this case, the fact `'msp-makeaminnow.hive_balance'` is evaluated to see if it is greater than `0.1`. The fact is enclosed in single quotes because the fact name contains a hyphen.
The `then` clause is a single command string in this case but can also be a JSON array of command strings that Karaka executes in order.

## Accounts
Accounts can be listed with just minimally a string, which would be the WIFA - or active key. Alternatively, a property object can be specified containing `wifa`, `wifp` if you
need to specifiy multiple keys. Account balances are reported whenever they change. You can suppress the displaying of a particular account by adding the property `"silent": true` - useful for exchange accounts.

## Facts
A fact generally takes the form of `accountname`.`tokensymbol`_`type` where type is balance or stake. For example, `eturnerx.hive_balance` is the fact with the value of eturnerx's liquid hive balance.
GOTCHA: account names with a hyphen-in-them must use 'single quotes' around the fact name.
There is a per-blockchain `constants` section where the user can hardcode facts. Constants simplify the administration of rules that reuse the same values, such as setting the reserve (keep-back) levels of a particular token. Facts generally are scoped to within chains, but facts can be copied from other chains using `imports` or from external sources using `oracles`. Imports and oracles are covered below.

## Commands
The available commands are transfer, stake, sell, buy and warn. See the file `config_example.json` for various examples.

`transfer 1.000 HIVE from eturnerx to null` - this command transfers 1 HIVE from the account @eturnerx to the account @null. To note:
- the command comes first.
- the amount and symbol come next
- the other parameters are a pair of words `parameter_name` space `parameter_value`. In the above command, there are two parameter pairs, `from` and `to`.

Amounts can be mathematical expressions if enclosed in brackets. e.g.
`transfer (eturnerx.hbd_balance - 50) HIVE from eturnerx to null`
Karaka converts the results of mathematical expressions to an appropriate number of decimal places for the token type, rounded down.

Use backslash-double-quote escaping to enclosed memo/message parameters
`warn message \"This is a warning message.\"`

### transfer
`transfer 1.000 HIVE from eturnerx to null memo \"Burn baby burn\"`
prefix: transfer amount symbol
pairs: to, from, memo

Transfers with memos are a powerful tool because they can initiate token exchanges, keep associated accounts topped up and a whole host of other things.

### stake
`stake 1.000 HIVE from eturnerx to anotheraccount`
prefix: stake amount symbol
pairs: to, from

If only one of `to` or `from` is specified, then the missing parameter value is taken from the other to improve the readability of commands, for example:
`stake 1.000 HIVE to eturnerx` and `stake 1.000 HIVE from eturnerx` are equivalent commands.

### sell
`sell ((eturnerx.PAL_balance - palreserve) * 0.5) PAL for SWAP.HIVE from eturnerx at market`
prefix: stake amount symbol
pairs: for, from, at

The above `sell` command example sells PAL tokens for SWAP.HIVE. On the hive blockchain, the sell command can sell HIVE->HBD and HBD->HIVE. On the hiveengine sidechain, the `for` symbol must currently be SWAP.HIVE. To sell SWAP.HIVE for another token, use the `buy` command.
The `at` parameter must be set to `market` as a wordy reminder that all sales are at market price. Be aware that large sales may incur slippage.

### buy
`buy ('eturnerx.SWAP.HIVE_balance' * 0.5) SWAP.HIVE of BEE from 'eturnerx' at market`

prefix: buy amount symbol
pairs: of, from, at

This command buys a token with SWAP.HIVE on the hiveengine order book market. Not valid for the Hive blockchain; use `sell` instead.

### deposit
`save ('eturnerx.SWAP.HIVE_balance' - 5.0) HIVE to 'eturnerx'`

prefix: deposit amount symbol
pairs: to, from, memo

This command deposits a hive token (e.g. HIVE or HBD) to savings. Not valid for the Hive-Engine sidechain; there is no equivalent command.

### warn
`warn message \"This is a warning message.\"`
prefix: warn
pairs: message

This command outputs a message to the log. The message must be enclosed in backslash-double-quotes. Be aware that Karaka suppresses frequent repetition in logs.

### addliquidity
`addliquidity (eturnerx.DEC_balance) DEC from eturnerx topool 'DEC:SWAP.HIVE'`
prefix: addliquidity, amount, symbol
paris: from, topool

This command adds liquidity in the amount of `symbol` to the liquidity pool. Currently only supports specifying the amount of the first (base) token in the pair and assumes you have sufficient balance of the second (quote) token. Consider using a check in your `if` clause to check there is sufficient quote token balance; the prices supplied by the hive-engine token oracle should be within enough margin to be useful.


## Tutorials
Here are some tutorials that explain scenarios and features using examples.
- [Karaka Tutorial #1: A Basic Tutorial config.json example](https://hive.blog/engine/@eturnerx/karaka-tutorial-1-a-basic-tutorial-configjson-example)
- [Karaka Tutorial #2: Hive-Engine Tokens](https://hive.blog/engine/@eturnerx/d-buzz-not-working-on-5e8a5c9a21c53)
- [Karaka Tutorial #3: Constants](https://hive.blog/engine/@eturnerx/karaka-tutorial-3-constants)
- [Karaka Tutorial #4: Importing facts between chains](https://hive.blog/engine/@eturnerx/karaka-tutorial-4-import-facts)
- [Karaka Tutorial #5: Oracles](https://hive.blog/engine/@eturnerx/karaka-tutorial-5-oracles)
- [Karaka Tutorial #6: foreach saving you time and space](https://hive.blog/engine/@eturnerx/karaka-tutorial-6-foreach-saving)
- [Automating Hive with Karaka Tutorial #7: Hive Token Price Tickers (an oracle)](https://peakd.com/@eturnerx/automating-hive-with-karaka-tutorial-7-hive-token-price-tickers-an-oracle)

## Imports
See the tutorial: [Karaka Tutorial #4: Importing facts between chains](https://hive.blog/engine/@eturnerx/karaka-tutorial-4-import-facts)

## Oracles
Oracles bring in facts from outside of Karaka. Currently there are oracles for the Hive internal market, crypto prices from coingecko and hive-engine token prices. By default, facts asserted by oracles are copied into the scope of each chain and do not need to be imported. Each oracle declared in the config file can specify a unique prefix that can be used to avoid fact name clashes. 
See the tutorials: 
- [Karaka Tutorial #5: Oracles](https://hive.blog/engine/@eturnerx/karaka-tutorial-5-oracles)
- [Automating Hive with Karaka Tutorial #7: Hive Token Price Tickers (an oracle)](https://peakd.com/@eturnerx/)

### printsuppresspct
Oracles can be very chatty in the logs if allowed to print out a value whenever something changes. Oracles can have an optional `printsuppresspct` set to a percentage that a value must change since it's last printing before it is output again. The default value of 0.5 - half a percent to emulate past behaviour. Set the value lower to output more often or higher to output less. 0.75 works well enough. The `printsuppresspct` value only affects logging and not the value of facts - the current value is always used to evaluate rules.

e.g. `{ "type": "hiveengineorderbook", "params": { "tokens": [ "DEC" ] }, "printsuppresspct": 0.75}`


## Foreach: basic wildcards for rules
See the tutorial: [Karaka Tutorial #6: foreach saving you time and space](https://hive.blog/engine/@eturnerx/karaka-tutorial-6-foreach-saving)

## License
Copyright © 2021 Emmanuel King Turner - All Rights Reserved.
MIT License. See the LICENSE file
