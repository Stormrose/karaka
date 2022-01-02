import * as fs from 'fs'
import { mainTick, primeOrderId } from './modules/mainTick'
import { perChainInitialisation } from './modules/perChainInitialisation'
import { sleep } from './modules/delay'

(async function () {
    // Read config
    const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'))

    // Default check intervals if it isn't specified
    config.intervalmins ?? 43
    config.intervalrepeatmins ?? 3

    // Initialise a uniquie orderid
    primeOrderId()

    // Per-chain initialisation
    for (const chain of [config!.hive, config!.hiveengine]) perChainInitialisation(chain)

    // Main loop
    while(true) {
        let hassideeffects: boolean = await mainTick(config)
        await sleep(
            (hassideeffects ? config.intervalrepeatmins : config.intervalmins)
            * 60 * 1000
        )
    }
})()
