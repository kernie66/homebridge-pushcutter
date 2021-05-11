// homebridge-pushcutter/index.js
// Copyright © 2021 Kenneth Jagenheim. All rights reserved.
//
// Homebridge plugin for Pushcut notifications.

'use strict'

const PcPlatform = require('./lib/PcPlatform')
const packageJson = require('./package.json')

module.exports = function (homebridge) {
  PcPlatform.loadPlatform(homebridge, packageJson, 'Pushcutter', PcPlatform)
}
