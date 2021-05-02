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

Then edit the config.json file to your specific needs.

## config.json file
The program takes its instructions from a file named `config.json`. Look at the `config_example.json` file and build your own. The rules are somewhat human-readable.

## Concepts
For each supported blockchain, the program gathers *facts* about listed accounts and then checks these facts against the `if` clause of supplied rules. Matched rules have the commands in their `then` clauses executed.

An example rule:
`{ "if": "'msp-makeaminnow.hive_balance' > 0.100", `
`  "then": "stake ('msp-makeaminnow.hive_balance') HIVE from 'msp-makeaminnow'" }`

The `if` clauses contains a conditional statement. In this case, the fact `'msp-makeaminnow.hive_balance'` is evaluated to see if it is greater than `0.1`. The fact is enclosed in single quotes because the fact name contains a hyphen.
The `then` clause is a single command string in this case but can also be a JSON array of commands strings that Karaka executes in order.

## Facts
A fact generally takes the form of `accountanme`.`tokensymbol`_`type` where type is balance or stake. For example, `eturnerx.hive_balance` is the fact with the value of eturnerx's liquid hive balance.
GOTCHA: account names with a hyphen-in-them must use 'single quotes' around the fact name.
There is a per-blockchain `constants` section where the user can hardcode facts. Constants simplify the administration of rules that reuse the same values, such as setting the reserve (keep-back) levels of a particular token.

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

### warn
`warn message \"This is a warning message.\"`
prefix: warn
pairs: message

This command outputs a message to the log. The message must be enclosed in backslash-double-quotes. Be aware that Karaka suppresses repetition in logs.

## License
Copyright © 2021 Emmanuel King Turner - All Rights Reserved.
MIT License. See the LICENSE file
