// homebridge-pushcutter/lib/SwitchService.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const homebridgeLib = require('homebridge-lib')
const AbortController = require('abort-controller')
const PcTypes = require('./PcTypes')
const wait = PcTypes.wait
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

    this.values.on = false
    if (this.startOnReboot) {
      this.initSwitch()
    }
  }
  
  async initSwitch() {
    await wait(5000)
    this.log('Start the timer at reboot')
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
      let options = this.options
      if (this.pcTitle) {
        jsonObject = {'title': this.pcTitle}
        json = Object.assign(json, jsonObject)
      } 
      if (this.pcText) {
        jsonObject = {'text': this.pcText}
        json = Object.assign(json, jsonObject)
      }
      options.json = json
      this.debug('Url: %s, Options: %s, JSON: %s', this.url, options, options.json)

      got.post(this.url, options)
      .then ( res => {
        json = res.body
        this.log("Success", json)
      })
      .catch ( err => {
        const str = String(err)
        this.log(str)
        if (err.response) {
          this.log("Fail", err.response.statusCode, err.response.error)
        }
      })

      let dt = DateTime.now().setLocale('sv')
      let time = dt.toLocaleString(DateTime.TIME_SIMPLE)
      let date = dt.toLocaleString(DateTime.DATE_MED)
      let week = dt.toFormat('WW')
      this.log('Date: %s, Time: %s, Week: %s', date, time, week)

      this.log('Starting the mute timer for %d s', this.mute)
      this.timeUp = false
      try {
        await wait(this.mute * 1000, { signal: this.signal })
        this.log('Mute time is up!')
        this.timeUp = true
        this.values.on = false
        this.switchOn = false
        if (this.repetition < this.repeats) {
          await wait(4000) // Wait for the motion to complete, 4 s
          this.repetition += 1
          this.log('Restart, repetition number: %d of %d', this.repetition, this.repeats)
          this.values.on = true
        } else {
          this.repetition = 0
        }
      } catch(err) {
        this.warn('The mute timer was aborted!')
        this.repetition = 0
      }
      this.updateValues()
    }
  }
  
  updateValues () {
    this.values.repetition = this.repetition
  }
}

module.exports = SwitchService
