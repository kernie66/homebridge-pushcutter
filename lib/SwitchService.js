// homebridge-pushcutter/lib/SwitchService.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const homebridgeLib = require('homebridge-lib')
const AbortController = require('abort-controller')
const PcTypes = require('./PcTypes')
const wait = PcTypes.wait
const stringInject = PcTypes.stringInject
const got = require('got')
const {DateTime} = require('luxon')
const util = require('util')
const pcImage = 'https://raw.githubusercontent.com/MTry/homebridge-smart-irrigation/master/branding/pcimage.png'
const pcURL = 'https://api.pushcut.io/v1/notifications/'
let pushcutDevices = []

class SwitchService extends homebridgeLib.ServiceDelegate {
  constructor (switchAccessory, params = {}) {
    params.name = switchAccessory.name
    params.Service = switchAccessory.Services.hap.Switch
    super(switchAccessory, params)
    this.url = switchAccessory.url
    this.options = switchAccessory.options
    this.useApi = switchAccessory.useApi
    this.pcTitle = switchAccessory.pcTitle
    this.pcText = switchAccessory.pcText
    this.mute = switchAccessory.mute
    this.pc = switchAccessory.pc
    this.switchName = params.name
    this.switchOn = false
    this.timeUp = false

    this.addCharacteristicDelegate({
      key: 'on',
      Characteristic: this.Characteristics.hap.On,
      value: false
    }).on('didSet', (value) => {
      this.switchOn = value
      this.debug("Calling 'setOn' with value %s", this.switchOn) 
      this.setOn()
//    }).on('didTouch', (value) => {
//      this.switchOn = value
//      this.debug("Repeat 'setOn' with value %s", this.switchOn) 
//      this.setOn(switchAccessory)
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
      let options = this.options
      let dt = DateTime.now().setLocale('sv')
      let textObject = {}
      textObject.time = dt.toLocaleString(DateTime.TIME_SIMPLE)
      textObject.date = dt.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)
      textObject.week = dt.toFormat('WW')
      textObject.name = this.switchName

      if (this.pcTitle) {
        let pcTitle = stringInject(this.pcTitle, textObject)
        this.log('%o, %s', textObject, pcTitle)
        jsonObject = {'title': pcTitle}
        json = Object.assign(json, jsonObject)
      } 
      if (this.pcText) {
        let pcText = stringInject(this.pcText, textObject)
        this.log('%o, %s', textObject, pcText)
        jsonObject = {'text': pcText}
        json = Object.assign(json, jsonObject)
      }
      options.json = json
      this.debug('Url: %s, Options: %s, JSON: %s', this.url, options, options.json)

      got.post(this.url, options)
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
