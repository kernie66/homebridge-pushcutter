// homebridge-pushcutter/lib/PcTypes.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Custom HomeKit Characteristics and common functions.

const homebridgeLib = require('homebridge-lib')

const sleep = (seconds) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, seconds * 1000)
  })
}

function wait(ms, opts = {}) {
  return new Promise((resolve, reject) => {
    let timerId = setTimeout(resolve, ms);
    if (opts.signal) {
      // implement aborting logic for our async operation
      opts.signal.addEventListener('abort', event => {
        clearTimeout(timerId);
        reject(event);
      })
    }
  })
}

function stringInject(str, data) {
  if (typeof str === 'string' && (data instanceof Array)) {
    return str.replace(/({\d})/g, function(i) {
      return data[i.replace(/{/, '').replace(/}/, '')];
    });
  } else if (typeof str === 'string' && (data instanceof Object)) {
    if (Object.keys(data).length === 0) {
      return str;
    }
    for (let key in data) {
      return str.replace(/({([^}]+)})/g, function(i) {
        let key = i.replace(/{/, '').replace(/}/, '');
        if (!data[key]) {
          return i;
        }
        return data[key];
      });
    }
  } else if (typeof str === 'string' && data instanceof Array === false || typeof str === 'string' && data instanceof Object === false) {
    return str;
  } else {
    return false;
  }
}

const regExps = {
  uuid: /^[0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/,
  uuidPrefix: /^[0-9A-F]{1,8}$/,
  uuidSuffix: /^-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/
}

function uuid (id, suffix = '-0000-1000-8000-656261617577') {
//'-0000-1000-8000-0026BB765291') {
  if (typeof id !== 'string') {
    throw new TypeError('id: not a string')
  }
  if (!regExps.uuidPrefix.test(id)) {
    throw new RangeError(`id: ${id}: invalid id`)
  }
  if (typeof suffix !== 'string') {
    throw new TypeError('suffix: not a string')
  }
  if (!regExps.uuidSuffix.test(suffix)) {
    throw new RangeError(`suffix: ${suffix}: invalid suffix`)
  }
  return ('00000000' + id).slice(-8) + suffix
}

class PcTypes extends homebridgeLib.CustomHomeKitTypes {
  constructor (homebridge) {
    super(homebridge)

    this.createCharacteristicClass('Delay', uuid('0A0'), {
      format: this.Formats.UINT16,
      unit: this.Units.SECONDS,
      minValue: 1,
      maxValue: 3600,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Delay time')
    this.createCharacteristicClass('MinDelay', uuid('0A1'), {
      format: this.Formats.UINT16,
      unit: this.Units.SECONDS,
      minValue: 0,
      maxValue: 3599,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Delay time (minimum)')
    this.createCharacteristicClass('TimeOut', uuid('0A2'), {
      format: this.Formats.UINT16,
      unit: this.Units.SECONDS,
      minValue: 0,
      maxValue: 3600,
      perms: [this.Perms.READ, this.Perms.NOTIFY],
    }, 'Current timeout value')
    this.createCharacteristicClass('Repeats', uuid('0A3'), {
      format: this.Formats.UINT8,
      minValue: 0,
      maxValue: 10,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE]
    }, 'Repetitions (total)')
    this.createCharacteristicClass('Repetition', uuid('0A4'), {
      format: this.Formats.UINT8,
      minValue: 0,
      maxValue: 10,
      perms: [this.Perms.READ, this.Perms.NOTIFY]
    }, 'Repetition (current)')
    this.createCharacteristicClass('Random', uuid('0A9'), {
      format: this.Formats.BOOL,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Random enabled')

  }
}

module.exports.PcTypes = PcTypes
module.exports.sleep = sleep
module.exports.wait = wait
module.exports.stringInject = stringInject