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
    return str.replace(/({\d})/g, function (i) {
      return data[i.replace(/{/, '').replace(/}/, '')];
    });
  } else if (typeof str === 'string' && (data instanceof Object)) {
    if (Object.keys(data).length === 0) {
      return str;
    }
    for (let key in data) {
      return str.replace(/({([^}]+)})/g, function (i) {
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

function uuid(id, suffix = '-0000-1000-8000-656261617577') {
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
  constructor(homebridge) {
    super(homebridge)

    this.createCharacteristicClass('Mute', uuid('0A5'), {
      format: this.Formats.UINT16,
      unit: this.Units.SECONDS,
      minValue: 1,
      maxValue: 3600,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Mute time')

    this.createCharacteristicClass('PcTitleDisplay', uuid('0A6'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY],
    }, 'Pushcut title (current)')

    this.createCharacteristicClass('PcTextDisplay', uuid('0A7'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY],
    }, 'Pushcut text (current)')

    this.createCharacteristicClass('PcTitle', uuid('0B6'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Pushcut title (enter new)')

    this.createCharacteristicClass('PcText', uuid('0B7'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Pushcut text (enter new)')

    this.createCharacteristicClass('Random', uuid('0A9'), {
      format: this.Formats.BOOL,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Random enabled')

    this.createCharacteristicClass('SoundDisplay', uuid('0AA'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY],
    }, 'Notification sound (current)')

    this.createCharacteristicClass('Sound', uuid('0AB'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Notification sound (set new)')

    this.createCharacteristicClass('DevicesDisplay', uuid('0AC'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY],
    }, 'Notificattion devices (current)')

    this.createCharacteristicClass('Devices', uuid('0AD'), {
      format: this.Formats.STRING,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Notification devices (set new)')

    this.createCharacteristicClass('Default', uuid('0B8'), {
      format: this.Formats.BOOL,
      perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE],
    }, 'Restore default')

  }
}

const validSounds = [
  "default",
  "vibrateOnly",
  "system",
  "subtle",
  "question",
  "jobDone",
  "problem",
  "loud",
  "lasers"
]

module.exports.PcTypes = PcTypes
module.exports.sleep = sleep
module.exports.wait = wait
module.exports.stringInject = stringInject
module.exports.validSounds = validSounds