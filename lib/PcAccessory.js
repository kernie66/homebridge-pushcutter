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
    this.notificationName = params.notificationName
    this.mute = params.mute || 5
    this.pcTitle = params.pcTitle
    this.pcText = params.pcText
    this.pc = platform.pc
    this.url = params.url
    this.options = this.api.options

    let json = {}
    let jsonObject = {}
    if (this.pcTitle) {
      jsonObject = {'title': this.pcTitle}
      json = Object.assign(json, jsonObject)
    } 
    if (this.pcText) {
      jsonObject = {'text': this.pcText}
      json = Object.assign(json, jsonObject)
    }
    this.options.json = json

    this.log('Accessory - Url: %s, Options: %s, JSON: %s', this.url, this.options, this.options.json)
//    this.log('Api: %s, Notification: %s', params.api, params.notificationName)

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
//          let json = {}
//        got.get(url + '/notifications', { headers: { 'API-Key': this.config.apiKey }, responseType: 'json' })
//          .then(res => {
//            json = res.body
//            this.debug('API URL returned: %s', json[0])
//          })
//          .catch(err => {
//            this.warn('Pushcut API URL error: %s code: %s', err, err.code)
//            this.log('Pushcut Error: %s | %s', err.response.statusCode, err.response.body.error)  
//          })
        //  json: { text: pushcutMessage, title: mailSubject, input: 'Scheduled', sound: this.pcWeatherCheckedSound, devices: pushcutDevices, image: pcImage },
