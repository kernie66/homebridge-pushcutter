// homebridge-pushcutter/lib/PcPlatform.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const events = require('events')
const got = require('got')
const parseUrl = require('parse-url')
const isUrlHttp = require('is-url-http')
const homebridgeLib = require('homebridge-lib')
const PcAccessory = require('./PcAccessory')
const PT = require('./PcTypes')
const PcTypes = PT.PcTypes

class PcPlatform extends homebridgeLib.Platform {
  constructor (log, configJson, homebridge) {
    super(log, configJson, homebridge)
    this.once('heartbeat', this.init)
    this.config = {
      name: 'Pushcutter',
    }
    let UUIDGen = homebridge.hap.uuid
    this.pc = new PcTypes(homebridge)
    
    const optionParser = new homebridgeLib.OptionParser(this.config, true)
    optionParser
      .stringKey('name')
      .stringKey('platform')
      .objectKey('api')
      .boolKey('selectApi')
      .stringKey('apiCode')
      .boolKey('useCustomUrl')
      .stringKey('customUrl')
      .arrayKey('notifications')
      .on('userInputError', (message) => {
        this.warn('config.json: %s', message)
      })
    try {
      optionParser.parse(configJson)
      let url = "https://api.pushcut.io/"
      if (this.config.api.useCustomUrl) {
        url = parseUrl(this.config.api.customUrl, true).href + '/'
        if (isUrlHttp(url)) {
          if (this.config.api.customUrl != url) {
            this.log('Custom URL automatically adjusted from "%s" to "%s"', this.config.api.customUrl, url)
          }
        } else {
          this.warn('The custom URL "%s" is not a valid URL', this.config.api.customUrl)
          throw new TypeError('customUrl: invalid URL')
        }
      } else if (this.config.api.selectApi == 'secret') {
        url = url + this.config.api.apiCode + '/notification/'
      } else {
        url = url + 'v1/'
      }
      this.config.api.apiUrl = url
      this.log('API URL is "%s"', url)

      if (this.config.notifications.length === 0) {
        this.warn('config.json: no notifications')
      }
      this.pushcutAccessories = {}
      const validNotifications = []
      for (const i in this.config.notifications) {
        const pushcutSwitch = this.config.notifications[i]
        const config = {}
        config.api = this.config.api
        const optionParser = new homebridgeLib.OptionParser(config, true)
        optionParser
          .stringKey('switchName')
          .stringKey('notificationName')
          .boolKey('useWebhook')
          .stringKey('webhook')
          .intKey('mute', 1, 60)
          .stringKey('sound')
          .on('userInputError', (error) => {
            this.warn('config.json: notifications[%d]: %s', i, error)
          })
        optionParser.parse(pushcutSwitch)
        config.uuid = UUIDGen.generate(config.switchName)
        this.debug('Found switch: %s', config.switchName)
        if (config.useWebhook) {
          url = parseUrl(config.webhook, true).href
          if (isUrlHttp(url)) {
            if (config.webhook != url) {
              this.log('Webhook URL automatically adjusted from "%s" to "%s"', config.webhook, url)
              config.webhook = url
            }
          this.log('Using Webhook URL "%s" for %s', url, config.switchName)
          } else {
            this.warn('The webhook URL "%s" is not a valid URL', this.config.api.customUrl)
            throw new TypeError('webhook: invalid URL')
          }
        }
        validNotifications.push(config)
      }
      this.config.notifications = validNotifications
    } catch (error) {
      this.fatal(error)
    }
    this.debug('config: %j', this.config)
  }

  async init (beat) {
    const jobs = []
    for (const pushcutSwitch of this.config.notifications) {
      const switchParams = {
        name: pushcutSwitch.switchName,
        id: pushcutSwitch.uuid,
        manufacturer: 'Homebridge',
        model: 'Pushcut-' + pushcutSwitch.switchName,
        category: this.Accessory.Categories.Switch
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
}

module.exports = PcPlatform
