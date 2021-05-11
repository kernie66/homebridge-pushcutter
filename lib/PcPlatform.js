// homebridge-pushcutter/lib/PcPlatform.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const events = require('events')
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
      .stringKey('apiKey')
      .arrayKey('notifications')
      .on('userInputError', (message) => {
        this.warn('config.json: %s', message)
      })
    try {
      optionParser.parse(configJson)
      if (this.config.notifications.length === 0) {
        this.warn('config.json: no notifications')
      }
      this.pushcutAccessories = {}
      const validNotifications = []
      for (const i in this.config.notifications) {
        const pushcutSwitch = this.config.notifications[i]
        const config = {}
        const optionParser = new homebridgeLib.OptionParser(config, true)
        optionParser
          .stringKey('switchName')
          .stringKey('notificationName')
          .stringKey('sound')
          .on('userInputError', (error) => {
            this.warn('config.json: notifications[%d]: %s', i, error)
          })
        optionParser.parse(pushcutSwitch)
        config.uuid = UUIDGen.generate(config.switchName)
        this.debug('Found switch: %s', config.switchName)
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
    this.debug('initialised')
    this.emit('initialised')
  }
}

module.exports = PcPlatform
