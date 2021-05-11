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
const pcImage = 'https://raw.githubusercontent.com/MTry/homebridge-smart-irrigation/master/branding/pcimage.png'
const pcURL = 'https://api.pushcut.io/v1/notifications/'
let pushcutDevices = []

class SwitchService extends homebridgeLib.ServiceDelegate {
  constructor (switchAccessory, params = {}) {
    params.name = switchAccessory.name
    params.Service = switchAccessory.Services.hap.Switch
    super(switchAccessory, params)
    this.apiKey = switchAccessory.apiKey
    this.minDelay = switchAccessory.minDelay
    this.pc = switchAccessory.pc

    this.addCharacteristicDelegate({
      key: 'on',
      Characteristic: this.Characteristics.hap.On,
      value: false
    }).on('didSet', (value) => {
      this.switchOn = value
      this.debug("Calling 'setOn' with value %s", this.switchOn) 
      this.setOn(switchAccessory)
    }).on('didTouch', (value) => {
      this.switchOn = value
      this.debug("Repeat 'setOn' with value %s", this.switchOn) 
      this.setOn(switchAccessory)
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
  
  async setOn (switchAccessory) {
    let delayType = ''
    
    if (!this.switchOn) {
      if (!this.timeUp) {
        try {
          this.debug('Aborting the timer before time is up')    
          this.ac.abort()
        } catch(e) {
          this.warn('Error when aborting timer: %s', e.message)
        }
      }
    } else {
      this.ac = new AbortController()
      this.signal = this.ac.signal
      if (this.minDelay > this.delay) {
        this.minDelay = this.delay
      }
      if (this.random) {
        this.timeout = Math.floor(this.minDelay + Math.random() * (this.delay - this.minDelay) + 1);
        delayType = 'random'
      } else {
        this.timeout = this.delay;
        delayType = 'fixed'
      }
      this.log('Starting the timer with %s delay: %d s', delayType, this.timeout)
      this.updateValues()
      this.timeUp = false
      try {
        await wait(this.timeout * 1000, { signal: this.signal })
        this.log('Time is up!')
        this.timeUp = true
        this.values.on = false
        this.switchOn = false
        if (!this.disableSensor) {
          this.log('Triggering motion sensor')
          switchAccessory.emit('trigger', true)
        }
        if (this.repetition < this.repeats) {
          await wait(4000) // Wait for the motion to complete, 4 s
          this.repetition += 1
          this.log('Restart, repetition number: %d of %d', this.repetition, this.repeats)
          this.values.on = true
        } else {
          this.repetition = 0
        }
      } catch(err) {
        this.warn('The timer was aborted!')
        this.repetition = 0
      }
      this.updateValues()
    }
  }
  
  updateValues () {
    this.values.repetition = this.repetition
    this.values.timeout = this.timeout || 0
  }
}

module.exports = SwitchService
