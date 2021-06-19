[![npm](https://badgen.net/npm/v/homebridge-pushcutter)](https://www.npmjs.com/package/homebridge-pushcutter)
[![npm](https://badgen.net/npm/dw/homebridge-pushcutter)](https://www.npmjs.com/package/homebridge-pushcutter)
[![npm](https://badgen.net/npm/dt/homebridge-pushcutter)](https://www.npmjs.com/package/homebridge-pushcutter)

# Homebridge-Pushcutter

With this plugin, you can create any number of fake switches that will trigger a [Pushcut](https://pushcut.io) notification when turned ON. The notification is muted for a selectable time (indicated by the switch remaining in the ON position) to avoid multiple notifications.

The Pushcut notifications must be defined in Pushcut before they can be used, but the title and the text of the notification can be updated in the switch configuration. The title and text can include the name of the switch, and the current time, date and week number.

The plugin supports Pushcut API keys, Webhook secrets and complete Webhooks. You can also use a custom URL, to trigger any type of URL based actions.

The plugin is designed as a platform to make it easier to create multiple switches using the same API key or Webhook secret. Also multiple platforms are supported, to allow different keys or secrets to be used.

## How to install

 * ```sudo npm install -g homebridge-pushcutter```
* Create a platform and a notification switch in your config.json file, or use the Homebridge UI
* Restart homebridge

## Example config.json:

 ```
    "platforms": [
      {
        "platform": "Pushcutter"
        "name": "Pushcutter",
        "api": {
          "selectApi": "apiKey",
          "apiCode": "<API key from Pushcut>",
          "locale": "sv"
        },
        "notifications": [
          {
            "switchName": "Evening",
            "notificationName": "Sunset",
            "useWebhook": false,
            "mute": 5,
            "pcTitle": "The sun is going down",
            "pcText": "Activated at {time}, {date} of week {week}.",
            "startOnReboot": true,
            "rebootTitle": "Homebridge restarted",
            "rebootText": "Restarted at {time} on {date}...",
            "sound": "vibrateOnly"
          }
        ]
       }
     ]
```
This gives you a switch called "Evening" which will trigger the Pushcut notification "Sunset" when activated. The title and the text of the Pushcut notification is replaced by the values in the configuration file. The text will show the time, date and week number when the switch was activated. The switch is also used to send a notification when Homebridge restarts, with a separate message. The notification will only cause the receiving devices to vibrate.

## How it works

Basically, all you need to do is:
1. Define a notification in [Pushcut](https://pushcut.io).
2. Get either the API key or the Webhook secret code from the Account page in the Pushcut app.
3. Select the type of key and enter the API key or Webhook secret in the config file.
4. For each notification, add a notification switch and enter the name of the Puchcut notification.
5. Add a new title and text for the notification, if desired. This makes it possible to create different notification switches using the same Pushcut notification, but with different contents.
6. Set the desired mute time in the config file (in seconds), to avoid additional activations within that time.
7. The plugin will create one switch for each notification.
8. Use this switch in any scene or automation to trigger the notification.

The characteristics of the switch are visible in the "EVE" app. These characteristics can be updated and used in automation conditions. The "Controller for Homekit" app is also a good way of controlling your automations.

## Configuration options

The possible configuration parameters are shown in the table below. Use the Config UI X for easy access to the configuration options and to generate a valid configuration in the config file.

Parameter | Default | Description
----------|---------|----------------
`platform` | `Pushcutter` | Identification of the Pushcutter platform configuration data.
`name`    | `Pushcutter` | Name used to identify the platform in the Homebridge log files. 
`api`     | N/A     | Array of API related configurations.
- `selectApi` | `apiKey` | Set to `apiKey` to use API key or `secret` to use the Webhook secret.
- `apiCode` | N/A   | API key code or Webhook secret code, depending on the setting of `selectApi`
- `locale`  | System default | Sets the locale for the time and date added by the plugin to the notification.
`notifications` | N/A | Array of notification switches
`switchName`| N/A | Name of the switch as seen in HomeKit
`notificationName`| N/A | Name of the Pushcut notification. Make sure that the correct name of an existing Pushcut notification is used. If the API key is used, the notification name will be checked by the plugin, see the HomeBridge log file.
- `useWebhook` | `false` | Set to `true` to use a complete Pushcut Webhook path, as defined for each notification in the Pushcut app. This overrides the `apiCode` for the selected switch. Useful if notifications are defined with different Webhook secrets. (boolean)
- `webhook` | N/A | Complete URL of the webhook to use for the notification when `useWebhook` is `true`. Get the URL from the Edit dialogue for the notification in the Pushcut app.
- `mute`   | 5 | Time in seconds after the activation of the switch to wait before another activation of the switch is possible. The switch will be in the ON state during the mute time. The switch can be turned off to end the mute state. This is to prevent multiple notifications of the same type within a defined time.
- `pcTitle` | N/A | Enter the title text to use for the notifiction, to override the title defined in the Pushcut app. Leave blank to keep the Pushcut defined title.
- `pcText` | N/A | Enter the body text to use for the notifiction, to override the text defined in the Pushcut app. Leave blank to keep the Pushcut defined text.
- `startOnReboot`   | `false` | Set to `true` to activate the notification switch when the plugin restarts. This makes it easy to get notified if Homebridge restarts unexpectedly. (boolean)
- `rebootTitle` | N/A | Enter the title text to use for the restart notifiction, to override any other title defined. Leave blank to keep the Pushcut defined title. This makes it possible to use an existing switch for the restart notification.
- `rebootText` | N/A | Enter the body text to use for the restart notifiction, to override any other text defined for the switch. Leave blank to keep the Pushcut defined text.
- `sound` | `system` | Notification sound. See Config UI X configuration for possible values. (lowercase string)

## Insert time and date

## Locales
[ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)