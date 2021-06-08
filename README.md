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
          "apiCode": "<API key from Pushcut>"
        },
        "notifications": [
          {
            "switchName": "Evening",
            "notificationName": "Sunset",
            "useWebhook": false,
            "mute": 5,
            "pcTitle": "The sun is going down",
            "pcText": "Activated at {time}, {date} of week {week}.",
            "sound": "vibrateOnly"
          }
        ]
       }
     ]
```
This gives you a switch called "Evening" which will trigger the Pushcut notification "Sunset" when activated. The title and the text of the Pushcut notification is replaced by the values in the configuration file. The text will show the time, date and week number when the switch was activated. The notification will only cause the receiving devices to vibrate.

## Locales
[ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)