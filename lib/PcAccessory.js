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
    this.api = params.api
//    this.notificationName = params.notificationName
    this.mute = params.mute || 5
    this.notification = params.notification
    this.pcClient = params.pcClient
    this.pcTitle = params.pcTitle
    this.pcText = params.pcText
    this.pc = platform.pc
    this.url = params.url
    this.options = this.api.options

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

    }
  }
}

module.exports = PcAccessory
