// homebridge-pushcutter/lib/SwitchService.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const homebridgeLib = require('homebridge-lib')
const AbortController = require('abort-controller')
const PcTypes = require('./PcTypes')
const wait = PcTypes.wait
const validSounds = PcTypes.validSounds
const replace = require('key-value-replace')
const delimiter = [ '{', '}']
const {DateTime} = require('luxon')
const pushcutDevices = []

class SwitchService extends homebridgeLib.ServiceDelegate {
  constructor (switchAccessory, params = {}) {
    params.name = switchAccessory.name
    params.Service = switchAccessory.Services.hap.Switch
    super(switchAccessory, params)
    this.useApi = switchAccessory.useApi
    this.locale = switchAccessory.api.locale || false
    this.notification = switchAccessory.notification
    this.pcClient = switchAccessory.pcClient
    this.pcTitle = switchAccessory.pcTitle
    this.pcText = switchAccessory.pcText
    this.pcImage = switchAccessory.pcImage
    this.mute = switchAccessory.mute
    this.startOnReboot = switchAccessory.startOnReboot
    this.rebootTitle = switchAccessory.rebootTitle
    this.rebootText = switchAccessory.rebootText
    this.sound = switchAccessory.sound
    this.devices = switchAccessory.devices
    this.useConfig = switchAccessory.useConfig
    this.pushcutDevices = switchAccessory.pushcutDevices
    this.pc = switchAccessory.pc
    this.switchName = params.name
    this.switchOn = false
    this.timeUp = false
    this.useReboot = false

    this.addCharacteristicDelegate({
      key: 'on',
      Characteristic: this.Characteristics.hap.On,
      value: false
    }).on('didSet', (value) => {
      this.switchOn = value
      this.debug("Calling 'setOn' with value %s", this.switchOn) 
      this.setOn()
    })

    this.addCharacteristicDelegate({
      key: 'mute',
      value: this.mute,
      Characteristic: this.pc.Characteristics.Mute,
//    }).on('didSet', (value) => {
//      this.mute = value
    })

    this.addCharacteristicDelegate({
      key: 'pcTitle',
      value: this.pcTitle,
      Characteristic: this.pc.Characteristics.Title,
      getter: async () => {
        if (this.values.pcTitle) {
          return this.values.pcTitle
        } else {
          return "Uses Pushcut defined title"
        }
      }
    })

    this.addCharacteristicDelegate({
      key: 'pcText',
      value: this.pcText,
      Characteristic: this.pc.Characteristics.Text,
      getter: async () => {
        if (this.values.pcText) {
          return this.values.pcText
        } else {
          return "Uses Pushcut defined text"
        }
      }
    })

    this.addCharacteristicDelegate({
      key: 'newPcTitle',
      value: this.pcTitle,
      Characteristic: this.pc.Characteristics.NewTitle,
    }).on('didSet', (value) => {
      if (value) {
        this.values.pcTitle = value
      }
    })

    this.addCharacteristicDelegate({
      key: 'newPcText',
      value: this.pcText,
      Characteristic: this.pc.Characteristics.NewText,
    }).on('didSet', (value) => {
      this.values.pcText = value
    })    

    this.addCharacteristicDelegate({
      key: 'sound',
      value: this.sound,
      Characteristic: this.pc.Characteristics.Sound,
      getter: async () => {
        if (this.values.sound !== "default") {
          return this.values.sound
        } else {
          return "Uses Pushcut defined sound"
        }
      }
    })    

    this.addCharacteristicDelegate({
      key: 'setSound',
      value: this.sound,
      Characteristic: this.pc.Characteristics.SetSound,
    }).on('didSet', (value) => {
      if (validSounds.includes(value)) {
        this.values.sound = value
      }
      else {
        this.warn("Illegal sound value entered.")
      }
    })    

    this.addCharacteristicDelegate({
      key: 'devices',
      value: this.devices,
      Characteristic: this.pc.Characteristics.Devices,
      getter: async () => {
        if (this.values.devices) {
          return this.values.devices
        } else {
          return "Send to all Pushcut devices"
        }
      }
    })    

    this.addCharacteristicDelegate({
      key: 'setDevices',
      value: this.devices,
      Characteristic: this.pc.Characteristics.SetDevices,
    }).on('didSet', (value) => {
      let deviceArray = value.split(',')
      let deviceValid = true
      deviceArray.forEach((device) => {
        if (!this.pushcutDevices.includes(device)) {
          deviceValid = false
        }
      })
      if (deviceValid) {
        this.values.devices = value
      }
      else {
        this.warn("Illegal device name(s) entered.")
      }
    })    

    this.addCharacteristicDelegate({
      key: 'heartrate',
      Characteristic: this.Characteristics.my.Heartrate,
      props: {
        minValue: 1,
        maxValue: 60,
        minStep: 1
      },
      value: 15
    })

    this.addCharacteristicDelegate({
      key: 'logLevel',
      Characteristic: this.Characteristics.my.LogLevel,
      value: switchAccessory.platform.logLevel
/*    }).on('didSet', (value) => {
      switchAccessory.logLevel = value */
    })

    this.addCharacteristicDelegate({
      key: 'setDefault',
      value: false,
      Characteristic: this.pc.Characteristics.Default,
    }).on('didSet', (value) => {
      this.setConfigValues()
    })

    if (this.useConfig) {
      this.log("Restoring values from config file")
      this.setConfigValues()
    }
    
    this.values.on = false
    if (this.startOnReboot) {
      this.initSwitch()
    }
  }
  
  async setConfigValues() {
    this.values.pcTitle = this.pcTitle
    this.values.pcText = this.pcText
    this.values.pcImage = this.pcImage
    this.values.sound = this.sound
    this.values.devices = this.devices
    await wait(500)
    this.values.setDefault = false
  }

  async initSwitch() {
    await wait(5000)
    this.log('Send notification at reboot')
    this.useReboot = true
    this.values.on = true
  }
  
  async setOn () {
    let delayType = ''
    let json = {}
    
    if (!this.switchOn) {
      if (!this.timeUp) {
        try {
          this.debug('Aborting the mute period before time is up')    
          this.ac.abort()
        } catch(e) {
          this.warn('Error when aborting mute: %s', e.message)
        }
      }
    } else {
      // Wait to ensure that updated values are set before the notification
      await wait(500)
      this.ac = new AbortController()
      this.signal = this.ac.signal

      let json = {}
      let jsonObject = {}
      let dt = DateTime.now()
      if (this.locale) {
        dt = dt.setLocale(this.locale)
      }
      let textObject = {}
      textObject.time = dt.toLocaleString(DateTime.TIME_SIMPLE)
      textObject.date = dt.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)
      textObject.week = dt.toFormat('WW')
      textObject.name = this.switchName

      let pcTitle = this.useReboot ? this.rebootTitle : this.values.pcTitle
      let pcText = this.useReboot ? this.rebootText : this.values.pcText
      if (pcTitle) {
        pcTitle = replace(pcTitle, textObject, delimiter)
        this.debug('%o, %s', textObject, pcTitle)
        jsonObject = {'title': pcTitle}
        json = Object.assign(json, jsonObject)
      } 
      if (pcText) {
        pcText = replace(pcText, textObject, delimiter)
        this.debug('%o, %s', textObject, pcText)
        jsonObject = {'text': pcText}
        json = Object.assign(json, jsonObject)
      }
      if (this.values.pcImage) {
        let pcImage = this.values.pcImage
        this.log('Image: %s', pcImage)
        jsonObject = {'image': pcImage}
        json = Object.assign(json, jsonObject)
      }
      if (this.values.sound !== "default") {
        jsonObject = {'sound': this.values.sound}
        json = Object.assign(json, jsonObject)
      }
      if (this.values.devices) {
        jsonObject = {'devices': this.values.devices}
        json = Object.assign(json, jsonObject)
      }

      this.log('Url: %s, JSON: %s', this.url, json)
      this.useReboot = false

      const response = await this.pcClient.post(this.notification, json)
      .then ( res => {
        json = res.body
        this.log("Notification sent: %s", json.message)
      })
      .catch ( err => {
        const str = String(err)
        this.debug(str)
        if (err.response) {
          this.warn("Notification failed: %s - %s", err.response.statusCode, err.response.error)
        }
      })

      this.log('Starting the mute timer for %d s', this.mute)
      this.timeUp = false
      try {
        await wait(this.mute * 1000, { signal: this.signal })
        this.log('Mute time is up!')
        this.timeUp = true
        this.values.on = false
        this.switchOn = false
      } catch(err) {
        this.warn('The mute timer was aborted!')
      }
    }
  }
}

module.exports = SwitchService
