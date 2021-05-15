// homebridge-pushcutter/lib/PcAccessory.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const homebridgeLib = require('homebridge-lib')
const SwitchService = require('./SwitchService')

class PcAccessory extends homebridgeLib.AccessoryDelegate {
  constructor (platform, params) {
    super(platform, params)
    this.apiKey = params.apiKey
    this.timeUp = true
    this.pc = platform.pc

    this.switchService = new SwitchService(
      this, { primaryService: true }, 
    )

    this.debug('Accessory initialised')
    this.heartbeatEnabled = true
    setImmediate(() => {
      this.emit('initialised')
    })
    this.on('heartbeat', async (beat) => { await this.heartbeat(beat) })
    this.on('shutdown', async () => { return this.shutdown() })
  }

  async shutdown () {
    this.debug('Nothing to do at shutdown')
  }

  async heartbeat (beat) {
    if (beat % this.switchService.values.heartrate === 0) {
      try {
        this.switchService.updateValues()
      } catch (error) {
        this.warn(error)
      }
    }
  }
}

module.exports = PcAccessory
