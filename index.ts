import * as fs from 'fs'
import { mainTick, primeOrderId } from './modules/mainTick'
import { perChainInitialisation } from './modules/perChainInitialisation'

(async function () {
    // Read config
    const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'))

    // Default check interval if it isn't specified
    config.intervalmins ?? 43

    // Initialise a uniquie orderid
    primeOrderId()

    // Per-chain initialisation
    for (const chain of [config!.hive, config!.hiveengine]) perChainInitialisation(chain)

    // Run once
    await mainTick(config)

    // Setup an interval to keep running
    setInterval(mainTick, config.intervalmins * 60 * 1000, config)
})()
