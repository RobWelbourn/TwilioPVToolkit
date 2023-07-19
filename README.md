# The Twilio Programmable Voice Toolkit

The Twilio Programmable Voice (PV) Toolkit is intended to simplify the building of Twilio voice apps. It does so by hiding away the details of webhooks and status callbacks, allowing you to write your programs in a top-down, synchronous fashion.

The PV Toolkit was inspired by [Twilio Studio](https://www.twilio.com/docs/studio), which threads together building blocks ('Make call', 'Play or say message', 'Gather user input', and so on) in a way that is clear to understand, and hides away the details of the Twilio REST API and webhooks. Studio is great for quickly building applications, but it is not always appropriate for the more complex ones. Sometimes you just need the flexibility that a first-class programming language gives you.

The PV Toolkit makes use of the following:

- Node.js, running the Express web application framework.
- [Ngrok](https://ngrok.com/), for securely tunneling Twilio webhooks when running your apps behind a firewall. (Optional)
- JavaScript [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), the programming construct that allows you to perform an operation and wait for the result.

A post describing how to use the PV Toolkit, how it was built, and the use of Promises, can be found on the Twilio Blog (link TBA).

# Toolkit contents

## `call.js`

This is the main module of the toolkit. It provides the `setup()` function for starting the Express web server, and handling webhooks and status callbacks from Twilio. Most importantly, it defines the `Call` class, which provides methods for making Outbound API calls and for returning [TwiML](https://www.twilio.com/docs/voice/twiml) in response to webhooks.

## `utils`

The `utils` directory supplies helper modules:

- `client.js` -- Provides a function to get a Twilio REST API client, using supplied credentials or those taken from environment variables.
- `ngrok.js` -- Provides the function `getTunnelInfo()` for allowing the Express web server to determine its public URL and the local port it is using.
- `phonenumbers.js` -- A wrapper around the [libphonenumber](https://gitlab.com/catamphetamine/libphonenumber) package, which converts between "friendly", local format phone numbers, and [E.164](https://www.twilio.com/docs/glossary/what-e164), international format numbers.
- `timeout.js` -- A "Promise-ified" version of the `setTimeout()` standard function, allowing pausing for a given number of milliseconds, or for timing out some action.

## `sample_apps`

The sample apps directory provides the following:

- `datasets.js` -- Datasets for you to use with the following sample programs. You should edit the phone numbers in this file to be numbers you control.
- `keypress1.js` -- A simple script that makes an outbound call and then prompts the called party to press some digits, saying what numbers were pressed. This illustrates the most basic form of an outbound [IVR](https://www.twilio.com/docs/glossary/what-is-ivr).
- `keypress2.js` -- As above, but for inbound calls to a Twilio number.
- `apptreminder.js` -- An appointment reminder script, where a patient is called about an upcoming appointment and asked to confirm, cancel or reschedule it.
- `apptreminder2.js` -- As above, but using asynchronous Answering Machine Detection (AMD).
- `conference.js` -- By calling a Twilio number, this script creates an ad-hoc conference bridge and invites a group of contacts to join it. It features an outbound IVR which prompts members of the group to press a digit to join.
- `oncall.js` -- Calls an on-call roster of support personnel in turn, notifying the responding party of an alert and asking them to acknowledge receipt of the message.
- `spoofcheck.js` -- The skeleton of a program that tells you whether or not an inbound call is likely using a spoofed phone number.

# Installation

As a prerequisite, you'll need to install [Node.js](https://nodejs.org/en/download) (version 18 or later). You may also want to use [Git](https://git-scm.com/) to download and update the PV Toolkit.

Once you've done that, download and install the PV Toolkit into your project folder as follows:

```sh
$ git clone https://github.com/RobWelbourn/TwilioPVToolkit.git
$ cd TwilioPVToolkit
$ npm install
```

If you prefer not to use Git, you can instead download the package as a zip file and then run `npm install` in the project folder.

Next, if you don't already have it, [install Ngrok](https://ngrok.com/download) and [sign up](https://dashboard.ngrok.com/signup) for a free account. Ngrok is a service which provides you with a public URL for an application that runs behind your firewall. The URL is connected to your application over a secure tunnel, which terminates at the Ngrok agent. The Ngrok agent is normally run as a stand-alone program, but there are also versions available as libraries that you can incorporate directly into your own application, for example, [this one](https://github.com/ngrok/ngrok-js) for Node.js.

> **Note**

> You don't need Ngrok to use the toolkit, but you will otherwise have to open up your firewall so that Twilio's webhooks and status callbacks can reach your app.

Start the Ngrok agent on your local machine, using the command `ngrok http 3000`:

![Ngrok agent screenshot](images/ngrok.jpeg)

This creates a secure tunnel between a random and dynamically created public URL – in this case, https://70a50f114404.ngrok.app – and the Ngrok agent on your computer. This URL will change every time you restart the agent, but if you want a permanent URL for configuring your Twilio webhooks, you can get one through a paid Ngrok subscription.
The tunnel will take HTTPS traffic on port 443 and feed it to your local web server as unencrypted HTTP on port 3000. You may notice that there's a local web interface, and this allows the agent to return the public URL and the local port that the server is running on. The PV Toolkit will make use of this API when setting up the local server, if no public URL is configured explicitly.
