// homebridge-pushcutter/lib/PcPlatform.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const events = require('events')
const parseUrl = require('parse-url')
const isUrlHttp = require('is-url-http')
const homebridgeLib = require('homebridge-lib')
const PcAccessory = require('./PcAccessory')
const PT = require('./PcTypes')
const PcTypes = PT.PcTypes

class PcPlatform extends homebridgeLib.Platform {
  constructor (log, configJson, homebridge) {
    super(log, configJson, homebridge)
//    this.once('heartbeat', this.init)
    this.config = {
      name: 'Pushcutter',
    }
    let UUIDGen = homebridge.hap.uuid
    this.notificationIds = []
    this.pc = new PcTypes(homebridge)
    let useApi = true
    
    const optionParser = new homebridgeLib.OptionParser(this.config, true)
    optionParser
      .stringKey('name')
      .stringKey('platform')
      .objectKey('api')
      .boolKey('selectApi')
      .stringKey('apiCode')
      .stringKey('locale')
      .arrayKey('notifications')
      .on('userInputError', (message) => {
        this.warn('config.json: %s', message)
      })
    try {
      optionParser.parse(configJson)
      let url = "api.pushcut.io"
      let secret = "/v1"
      let command = "/notifications"
      let headers = Object()
      if (this.config.notifications.length === 0) {
        this.warn('config.json: no notifications')
      }
        
      if (this.config.api.selectApi == 'secret') {
        useApi = false
        secret = "/" + this.config.api.apiCode
      } else {
        headers = {'API-Key': this.config.api.apiCode}
      }
      this.log('API URL is "%s"', url + secret + command)
      this.pcClient = new homebridgeLib.HttpClient({
        https: true,
        host: url,
        headers: headers,
        json: true,
        maxSockets: 1,
        path: secret + command,
        timeout: 5, //this.config.timeout,
        validStatusCodes: [200, 401, 403, 404]
      })

      this.pcClient
      .on('error', (error) => {
        this.log(
          'Pushcut request %d: Error = %s %s', error.request.id,
          error.request.method, error.request.resource
        )
        this.warn(
          'Pushcut request %d: Error = %d, %s', error.request.id, error.statusCode, error.statusMessage
        )
      })
      .on('request', (request) => {
//        this.debug(
        this.log(
          'Pushcut request %d: Request = %s, Resource = %s', request.id,
          request.method, request.resource
        )
        this.vdebug(
          'Pushcut request %d: Request = %s, URL = %s', request.id,
          request.method, request.url
        )
      })
      .on('response', (response) => {
//        this.vdebug(
        this.log(
          'Pushcut request %d: Response = %j', response.request.id,
          response.body
        )
//        this.debug(
        this.log(
          'Pushcut request %d: Response = %d %s', response.request.id,
          response.statusCode, response.statusMessage
        )
      })
    } catch (error) {
      this.fatal(error)
    }

    let emitter = new events.EventEmitter()
    if (useApi) {
      this.getNotifications()
      .then(notificationIds => {
        this.notificationIds = notificationIds
        this.log('Notifications: %s', notificationIds)
        emitter.emit('notifications')
      }) 
      .catch (error => {
        this.warn('Cannot get notification names from Pushcut: %s', error)
      })     
    } else {
      emitter.emit('notifications')
    }

    this.pushcutAccessories = {}
    const validNotifications = []
    this.log('Waiting for notifications')
    emitter.on('notifications', () => {
      this.log('Got notifications')
      this.once('heartbeat', this.init)
      for (const i in this.config.notifications) {
        const pushcutSwitch = this.config.notifications[i]
        const config = {}
        const optionParser = new homebridgeLib.OptionParser(config, true)
        optionParser
          .stringKey('switchName')
          .stringKey('notificationName')
          .boolKey('useWebhook')
          .stringKey('webhook')
          .stringKey('pcTitle')
          .stringKey('pcText')
          .intKey('mute', 1, 60)
          .boolKey('startOnReboot')
          .stringKey('rebootTitle')
          .stringKey('rebootText')
          .stringKey('sound')
          .on('userInputError', (error) => {
            this.warn('config.json: notifications[%d]: %s', i, error)
          })
        optionParser.parse(pushcutSwitch)
        config.uuid = UUIDGen.generate(config.switchName)
        this.log('Found switch: %s', config.switchName)
        if (config.useWebhook) {
          let fullUrl = parseUrl(config.webhook, true)
          let url = fullUrl.href
          let host = fullUrl.resource
          let path = fullUrl.pathname
          let urlPaths = path.split('/')
          config.notificationName = urlPaths[urlPaths.length-1]
          if (isUrlHttp(url)) {
            if (config.webhook != url) {
              this.log('Webhook URL automatically adjusted from "%s" to "%s"', config.webhook, url)
              config.webhook = url
            }
            this.log('Using Webhook URL "%s" for %s', url, config.switchName)

          } else {
            this.warn('The webhook URL "%s" is not a valid URL', config.webhook)
            throw new TypeError('webhook: invalid URL')
          }
        } 

        // Check if the notification is available from Pushcut
        if (this.notificationIds) {
          let included = this.notificationIds.includes(config.notificationName)
          if (included) {
            this.log('Confirmed that Pushcut includes notification %s', config.notificationName)
          } else {
            if (config.useWebhook) {
              this.warn('Webhook notification name not found in Pushcut: %s', config.notificationName)
            } else {
              this.warn('Notification name not found in Pushcut: %s', config.notificationName)
            }
          }
        } else {
          this.log('Notification name cannot be validated with Pushcut, must use API key')
        } 
        config.url = this.config.api.url + config.notificationName
        config.pcClient = this.pcClient
        //}
        validNotifications.push(config)
      }
      this.config.notifications = validNotifications
      this.debug('config: %j', this.config)
    })
  }

  async init (beat) {
    this.log('Init started')
    const jobs = []
    for (const pushcutSwitch of this.config.notifications) {
      const switchParams = {
        name: pushcutSwitch.switchName,
        id: pushcutSwitch.uuid,
        manufacturer: 'Homebridge',
        model: 'Pushcut-' + pushcutSwitch.switchName,
        category: this.Accessory.Categories.Switch,
        api: this.config.api,
//        url: pushcutSwitch.url,
        notification: '/' + pushcutSwitch.notificationName,
        pcClient: pushcutSwitch.pcClient,
        useWebhook: pushcutSwitch.useWebhook,
        webhook: pushcutSwitch.webhook,
        pcTitle: pushcutSwitch.pcTitle,
        pcText: pushcutSwitch.pcText,
        mute: pushcutSwitch.mute,
        startOnReboot: pushcutSwitch.startOnReboot,
        rebootTitle: pushcutSwitch.rebootTitle,
        rebootText: pushcutSwitch.rebootText,
        sound: pushcutSwitch.sound
      }
      const switchAccessory = new PcAccessory(this, switchParams)
      jobs.push(events.once(switchAccessory, 'initialised'))
      this.pushcutAccessories[pushcutSwitch] = switchAccessory
    }
    for (const job of jobs) {
      await job
    }
    this.debug('Platform initialised')
    this.emit('initialised')
  }

  async getNotifications () {
    try {
      let notificationArray = []
      const notifications = await this.pcClient.get()
      const json = await notifications.body
      json.forEach(element => {
        notificationArray.push(element.id)
      })
      return notificationArray
    } catch (err){
      this.warn('Cannot check notifications:', err.statusCode, err.body.error)
    }
  }  

}

module.exports = PcPlatform
