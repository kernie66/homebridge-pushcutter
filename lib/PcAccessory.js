// homebridge-pushcutter/lib/PcAccessory.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const homebridgeLib = require('homebridge-lib')
const parseUrl = require('parse-url')
const SwitchService = require('./SwitchService')

class PcAccessory extends homebridgeLib.AccessoryDelegate {
  constructor (platform, params) {
    super(platform, params)
    this.api = params.api
//    this.notificationName = params.notificationName
    this.mute = params.mute || 5
    this.notification = params.notification
    this.pcClient = params.pcClient
    this.useWebhook = params.useWebhook
    this.webhook = params.webhook
    this.pcTitle = params.pcTitle
    this.pcText = params.pcText
    this.pcImage = params.pcImage
    this.startOnReboot = params.startOnReboot
    this.rebootTitle = params.rebootTitle
    this.rebootText = params.rebootText
    this.sound = params.sound
    this.devices = params.devices
    this.useConfig = params.useConfig
    this.pushcutDevices = params.pushcutDevices
    this.pc = platform.pc

    if (this.useWebhook) {
      let fullUrl = parseUrl(this.webhook, true)
      let host = fullUrl.resource
      let path = fullUrl.pathname
      this.log('Webhook split into host %s and path %s', host, path)
      this.pcClient = new homebridgeLib.HttpClient({
        https: true,
        host: host,
//        headers: headers,
        json: true,
        maxSockets: 1,
        path: path,
        timeout: 5, //this.config.timeout,
        validStatusCodes: [200, 401, 403, 404]
      })
      this.notification = '/'

      this.pcClient
      .on('error', (error) => {
        this.log(
          'Webhook request %d: Error = %s %s', error.request.id,
          error.request.method, error.request.resource
        )
        this.warn(
          'Webhook request %d: Error = %d, %s', error.request.id, error.statusCode, error.statusMessage
        )
      })
      .on('request', (request) => {
        this.debug(
          'Webhook request %d: Request = %s, Resource = %s', request.id,
          request.method, request.resource
        )
        this.vdebug(
          'Webhook request %d: Request = %s, URL = %s', request.id,
          request.method, request.url
        )
      })
      .on('response', (response) => {
        this.vdebug(
          'Webhook request %d: Response = %j', response.request.id,
          response.body
        )
        this.debug(
          'Webhook request %d: Response = %d %s', response.request.id,
          response.statusCode, response.statusMessage
        )
      })
    }
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
