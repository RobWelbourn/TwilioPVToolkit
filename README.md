# The Twilio Programmable Voice Toolkit

The Twilio Programmable Voice (PV) Toolkit is intended to simplify the building of Twilio voice apps. It does so by hiding away the details of webhooks and status callbacks, allowing you to write your programs in a top-down, synchronous fashion.

The PV Toolkit was inspired by [Twilio Studio](https://www.twilio.com/docs/studio), which threads together building blocks ('Make call', 'Play or say message', 'Gather user input', and so on) in a way that is clear to understand, and hides away the details of the Twilio REST API and webhooks. Studio is great for quickly building applications, but it is not always appropriate for the more complex ones. Sometimes you just need the flexibility that a first-class programming language gives you.

The PV Toolkit makes use of the following:

- Node.js, running the Express web application framework.
- [Ngrok](https://ngrok.com/), for securely tunneling Twilio webhooks when running your apps behind a firewall. (Optional)
- JavaScript [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), the programming construct that allows you to perform an operation and wait for the result.

A post describing how to use the PV Toolkit, how it was built, and the use of Promises, can be found on the Twilio Blog (link TBD).

# Toolkit contents

## `src/call.js`

This is the main module of the toolkit. It provides the `setup()` function for starting the Express web server, and for handling webhooks and status callbacks from Twilio. Most importantly, it defines the `Call` class, which provides methods for making Outbound API calls and for returning [TwiML](https://www.twilio.com/docs/voice/twiml) in response to webhooks.

## `src/utils`

The `utils` folder supplies helper modules:

- `client.js` -- Provides a function to get a Twilio REST API client, using supplied credentials or those taken from environment variables.
- `ngrok.js` -- Provides the function `getTunnelInfo()` for allowing the Express web server to determine its public URL and the local port it is using.
- `phonenumbers.js` -- A wrapper around the [libphonenumber](https://gitlab.com/catamphetamine/libphonenumber) package, which converts between "friendly", local format phone numbers, and [E.164](https://www.twilio.com/docs/glossary/what-e164), international format numbers.
- `timeout.js` -- A "Promise-ified" version of the `setTimeout()` standard function, allowing pausing for a given number of milliseconds, or for timing out some action.

## `docs`

Generated documentation for the above.

## `src/sample_apps`

The `sample_apps` folder contains the following:

- `datasets.js` -- Datasets for you to use with the following sample programs. You should edit the phone numbers in this file to be numbers you control.
- `keypress1.js` -- A simple script that makes an outbound call and then prompts the called party to press some digits, saying what numbers were pressed. This illustrates the most basic form of an outbound [IVR](https://www.twilio.com/docs/glossary/what-is-ivr).
- `keypress2.js` -- As above, but for inbound calls to a Twilio number.
- `apptreminder.js` -- An appointment reminder script, where a patient is called about an upcoming appointment and asked to confirm, cancel or reschedule it.
- `apptreminder2.js` -- As above, but using asynchronous Answering Machine Detection (AMD).
- `conference.js` -- By calling a Twilio number, this script creates an ad-hoc conference bridge and invites a group of contacts to join it. It features an outbound IVR which prompts members of the group to press a digit to join.
- `oncall.js` -- Calls a roster of support personnel in turn, notifying the responding party of an alert and asking them to acknowledge receipt of the message.
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
>
> You don't need Ngrok to use the toolkit, but you will otherwise have to open up your firewall so that Twilio's webhooks and status callbacks can reach your app.

Start the Ngrok agent on your local machine, using the command `ngrok http 3000`:

![Ngrok agent screenshot](images/ngrok.jpeg)

This creates a secure tunnel between a random and dynamically created public URL – in this case, https://70a50f114404.ngrok.app – and the Ngrok agent on your computer. This URL will change every time you restart the agent, but if you want a permanent URL for configuring your Twilio webhooks, you can get one through a paid Ngrok subscription.
The tunnel will take HTTPS traffic on port 443 and feed it to your local web server as unencrypted HTTP on port 3000. You may notice that there's a local web interface, which allows the agent to return the server's public URL and the local port. The PV Toolkit will make use of this API when setting up the local server, if no public URL is configured explicitly.

# Getting started

Before you get started, you should understand how to use JavaScript Promises. PV Toolkit scripts will typically make heavy use of the `await` keyword when they are waiting for the Twilio API to perform some action, and accidentally omitting an `await` will cause your program to race ahead with unpredictable results. Sometimes you _do_ want to carry on without waiting, for example to make a number of outbound calls in parallel, in which case you will handle the results of your actions asynchronously.

If you are new to Promises, there is a very good explanation at (JavaScript.info)[https://javascript.info/promise-basics], and they are also covered in detail in the blog post.

Perhaps the best way of understanding how to use the PV Toolkit is to examine the sample apps. What follows below is the bare minimum to get started.

## Outbound scripts

Here's an example of an extremely simple outbound script. It simply calls a number and leaves a message:

```js
import { Call, CallEndedException, setup } from "../src/call.js";

async function script(to, from, message) {
  try {
    const call = await Call.makeCall(to, from);
    if (call.status === "in-progress") {
      call.pause({ length: 1 });
      call.say(message);
      call.pause({ length: 1 });
      call.hangup();
      await call.sendResponse();
    }
    console.log("Call status:", call.status);
  } catch (err) {
    if (err instanceof CallEndedException) {
      console.log("Called party hung up");
    } else {
      console.error(err.message);
    }
  }
}

const args = process.argv.slice(2);
setup()
  .then(() => script(...args))
  .catch((err) => console.error(err))
  .finally(() => process.exit(0)); // Shuts down the web server
```

We invoke it from the command line and supply the _to_ number, the _from_ number and a message:

```txt
$ node outbound.js +1617xxxxxxx +1617xxxxxxx "Hello, World"
Server running on port 3000 with URL https://a764622e77ec.ngrok.app
Call status: completed
```

The call to `setup()` uses Twilio account credentials stored in the standard environment variables TWILIO_ACCOUNT_SID, TWILIO_API_KEY and TWILIO_API_SECRET to create a REST API client; it finds a locally running Ngrok tunnel and determines its public URL; and it sets the Express web server running, ready to receive Twilio's webhooks and status callback requests. When that is complete, the function `script()` is run, using the command line parameters provided. Finally, when the script is complete, the call to `process.exit()` shuts down the web server.

The script uses the `Call.makeCall()` factory method to make an outbound call via the Twilio API and create a `Call` object. Notice the use of `await` to wait for Twilio to return with the result of the call, whereupon we can check whether or not it was answered. If so, the script executes some TwiML, using methods that will be familiar to anyone who has used the Twilio Node.js helper library for call handling. The method `sendResponse()` returns the TwiML in the response, and again we `await` the next event, which will be the status callback to indicate the end of the call. See the [Call documentation](docs/docs.md#callcall) for details of these methods.

It's always good practice to catch errors, and you should look for `CallEndedException` in particular: it tells you that the call has been hung up before the script was completed.

Among the sample apps that make outbound calls are [`apptreminder.js`](src/sample_apps/apptreminder.js), [`apptreminder2.js`](/src/sample_apps/apptreminder2.js), [`keypress1.js`](src/sample_apps/keypress1.js) and [`oncall.js`](src/sample_apps/oncall.js).

## Inbound scripts

When handling an inbound call, you have to pass the PV Toolkit a function that will be used to process the call. Here's an example that listens for speech and transcribes it to text:

```js
import { CallEndedException, setup } from "../src/call.js";

const script = async function (call) {
  call.say("Please say a few words.");
  await call.sendResponse();

  while (call.status === "in-progress") {
    call.gather({
      input: "speech",
      speechTimeout: "auto",
      language: "en-US",
      speechModel: "experimental_utterances",
      enhanced: "false",
    });
    await call.sendResponse();
    console.log("Result:", call.speechResult, "Confidence:", call.confidence);
  }

  console.log("Call ended");
};

const args = process.argv.slice(2);
setup({ script, phoneNumber: args[0] })
  .then(() => console.log("Script is ready"))
  .catch((err) => console.error(err));
```

You pass in, on the command line, one of your Twilio phone numbers, which will be configured with the URL of the script via the `setup()` function:

```txt
$node gather.js +1463xxxxxxx
Provisioned (463) xxx-xxxx with voice URL https://a764622e77ec.ngrok.app/inbound
Script is ready
Server running on port 3000 with URL https://a764622e77ec.ngrok.app
```

When you dial the number you will be prompted to say something, and the program will print out what the speech recognition service thought you said, and its degree of confidence, until the call is hung up.

Notice that the result of the `gather()` is stored as a property of the `Call` object, along with all the other attributes of interest, which are updated whenever a webhook or status callback is received. (Every time `gather()` is invoked, any previous results will be deleted.)

Sample apps that are also examples of inbound scripts include [`conference.js`](src/sample_apps/conference.js), [`keypress2.js`](src/sample_apps/keypress2.js) and [`spoofcheck.js`](src/sample_apps/spoofcheck.js).

## Status callbacks

When you make an outbound call, either via `Call.makeCall()` or the `dial()` method, you will by default get a status callback when the call ends, which you should `await` so that you can generate additional TwiML, or perform post-call actions. If you want to get other call progress events (such as 'ringing' or 'answered'), you may optionally request them:

```js
async function script(to, from, message) {
  const call = await Call.makeCall(to, from, {
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  while (true) {
    console.log("Source:", call.eventSource, "Status:", call.status);
    if (["completed", "failed", "busy", "no-answer"].includes(call.status))
      break;
    await call.nextEvent();
    if (call.eventSource == "webhook") {
      call.say(message);
      call.sendFinalResponse();
    }
  }
}
```

To wait for the next event, you would call the `nextEvent()` method; and to distinguish between events generated by status callbacks as opposed to webhooks, you can examine a call's [`eventSource`](docs/docs.md#calleventsource) property.

The [`spoofcheck.js`](src/sample_apps/spoofcheck.js) sample app makes use of additional status callbacks.

## Answering Machine Detection

You can request [Answering Machine Detection](https://www.twilio.com/docs/voice/answering-machine-detection-faq-best-practices) (AMD) with `Call.makecall()`:

```js
const call = await Call.makeCall(to, from, {
  machineDetection: "DetectMessageEnd",
  asyncAmd: true,
});
```

If you specify asynchronous AMD, then status callbacks will update the [`answeredBy`](docs/docs.md#callansweredby) property of the call.

The sample app [`apptreminder2.js`](src/sample_apps/apptreminder2.js) demonstrates the use of asynchronous AMD.
