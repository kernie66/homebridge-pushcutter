// homebridge-pushcutter/lib/SwitchService.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const homebridgeLib = require('homebridge-lib')
const AbortController = require('abort-controller')
const PcTypes = require('./PcTypes')
const wait = PcTypes.wait
const replace = require('key-value-replace')
const delimiter = [ '{', '}']
//const stringInject = PcTypes.stringInject
//const got = require('got')
const {DateTime} = require('luxon')
const pcImage = 'https://raw.githubusercontent.com/MTry/homebridge-smart-irrigation/master/branding/pcimage.png'
const pcURL = 'https://api.pushcut.io/v1/notifications/'
let pushcutDevices = []

class SwitchService extends homebridgeLib.ServiceDelegate {
  constructor (switchAccessory, params = {}) {
    params.name = switchAccessory.name
    params.Service = switchAccessory.Services.hap.Switch
    super(switchAccessory, params)
//    this.url = switchAccessory.url
    this.useApi = switchAccessory.useApi
    this.locale = switchAccessory.api.locale || false
    this.notification = switchAccessory.notification
    this.pcClient = switchAccessory.pcClient
    this.pcTitle = switchAccessory.pcTitle
    this.pcText = switchAccessory.pcText
    this.mute = switchAccessory.mute
    this.startOnReboot = switchAccessory.startOnReboot
    this.rebootTitle = switchAccessory.rebootTitle
    this.rebootText = switchAccessory.rebootText
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
    }).on('didSet', (value) => {
      this.mute = value
    })    
    this.addCharacteristicDelegate({
      key: 'pcTitle',
      value: this.pcTitle,
      Characteristic: this.pc.Characteristics.Title,
      getter: async () => {
        if (this.pcTitle) {
          return this.pcTitle
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
        if (this.pcText) {
          return this.pcText
        } else {
          return "Uses Pushcut defined text"
        }
      }
    })    
    this.addCharacteristicDelegate({
      key: 'newPcTitle',
      value: this.pcTitle,
      Characteristic: this.pc.Characteristics.NewTitle,
      getter: async () => {
        if (this.pcTitle) {
          return this.pcTitle
        } else {
          return "Uses Pushcut defined title"
        }
      }
    }).on('didSet', (value) => {
      this.pcTitle = value
    })    
    this.addCharacteristicDelegate({
      key: 'newPcText',
      value: this.pcText,
      Characteristic: this.pc.Characteristics.NewText,
      getter: async () => {
        if (this.pcText) {
          return this.pcText
        } else {
          return "Uses Pushcut defined text"
        }
      }
    }).on('didSet', (value) => {
      this.pcText = value
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
      value: switchAccessory.logLevel
    }).on('didSet', (value) => {
      switchAccessory.logLevel = value
    })
    this.values.on = false
    if (this.startOnReboot) {
      this.initSwitch()
    }
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

      let pcTitle = this.useReboot ? this.rebootTitle : this.pcTitle
      let pcText = this.useReboot ? this.rebootText : this.pcText
      if (pcTitle) {
        pcTitle = replace(pcTitle, textObject, delimiter)
        this.log('%o, %s', textObject, pcTitle)
        jsonObject = {'title': pcTitle}
        json = Object.assign(json, jsonObject)
      } 
      if (pcText) {
        pcText = replace(pcText, textObject, delimiter)
        this.log('%o, %s', textObject, pcText)
        jsonObject = {'text': pcText}
        json = Object.assign(json, jsonObject)
      }
      this.useReboot = false

      const response = await this.pcClient.post(this.notification, json)
      .then ( res => {
        json = res.body
        this.log("Notification sent: %s", json.message)
      })
      .catch ( err => {
        const str = String(err)
        this.log(str)
        if (err.response) {
          this.log("Notification failed: %s - %s", err.response.statusCode, err.response.error)
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
