## Modules

<dl>
<dt><a href="#module_call">call</a></dt>
<dd><p>The call module provides classes for call handling. It also configures and starts an Express web server 
to handle the associated webhooks and status callbacks. It exports the following:</p>
<ol>
<li><p>The Call class, which encapsulates a running call and its state. It wraps a Twilio VoiceResponse object that is
used to generate TwiML in response to webhooks.</p>
</li>
<li><p>The CallEndedException class, which is used to indicate that a call has ended prematurely, usually because the far
end has hung up before a script has finished executing.</p>
</li>
<li><p>The setup() function, which is used to configure and start the Express web server.</p>
</li>
</ol>
</dd>
<dt><a href="#module_client">client</a></dt>
<dd><p>The client module provides support for creating a Twilio API client.  The getClient() function will accept 
an account SID and API key+secret, or else it will look for the standard environment variables TWILIO_ACCOUNT_SID, 
TWILIO_API_KEY and TWILIO_API_SECRET, first in the operating system environment, and then in the Node.js .env file.</p>
</dd>
<dt><a href="#module_ngrok">ngrok</a></dt>
<dd><p>Queries the local Ngrok Agent API to get tunnel information.</p>
</dd>
<dt><a href="#module_phonenumbers">phonenumbers</a></dt>
<dd><p>This module provides a wrapper around libphonenumber-js, to allow parsing of phone numbers using the 
local machine&#39;s locale as the default.</p>
</dd>
<dt><a href="#module_timeout">timeout</a></dt>
<dd><p>Provides classes for applying timeouts to async operations.</p>
</dd>
</dl>

<a name="module_call"></a>

## call
The call module provides classes for call handling. It also configures and starts an Express web server 
to handle the associated webhooks and status callbacks. It exports the following:

1. The Call class, which encapsulates a running call and its state. It wraps a Twilio VoiceResponse object that is
used to generate TwiML in response to webhooks.

2. The CallEndedException class, which is used to indicate that a call has ended prematurely, usually because the far
end has hung up before a script has finished executing.

3. The setup() function, which is used to configure and start the Express web server.


* [call](#module_call)
    * [.CallEndedException](#module_call.CallEndedException)
        * [new exports.CallEndedException(call)](#new_module_call.CallEndedException_new)
    * [.Call](#module_call.Call)
        * _instance_
            * [.childCalls](#module_call.Call+childCalls)
            * [.eventSource](#module_call.Call+eventSource)
            * [.sid](#module_call.Call+sid)
            * [.dialCallSid](#module_call.Call+dialCallSid)
            * [.to](#module_call.Call+to)
            * [.from](#module_call.Call+from)
            * [.callerName](#module_call.Call+callerName)
            * [.status](#module_call.Call+status)
            * [.dialCallStatus](#module_call.Call+dialCallStatus)
            * [.answeredBy](#module_call.Call+answeredBy)
            * [.machineDetectionDuration](#module_call.Call+machineDetectionDuration)
            * [.callToken](#module_call.Call+callToken)
            * [.stirVerstat](#module_call.Call+stirVerstat)
            * [.stirPassportToken](#module_call.Call+stirPassportToken)
            * [.stirStatus](#module_call.Call+stirStatus)
            * [.direction](#module_call.Call+direction)
            * [.digits](#module_call.Call+digits)
            * [.finishedOnKey](#module_call.Call+finishedOnKey)
            * [.speechResult](#module_call.Call+speechResult)
            * [.confidence](#module_call.Call+confidence)
            * [.sipResponseCode](#module_call.Call+sipResponseCode)
            * [.errorCode](#module_call.Call+errorCode)
            * [.errorMessage](#module_call.Call+errorMessage)
            * [.cancel()](#module_call.Call+cancel) ⇒ <code>Promise</code>
            * [.say(...args)](#module_call.Call+say) ⇒ <code>Say</code>
            * [.play(...args)](#module_call.Call+play) ⇒ <code>Play</code>
            * [.pause(...args)](#module_call.Call+pause) ⇒ <code>Play</code>
            * [.gather(...args)](#module_call.Call+gather) ⇒ <code>Gather</code>
            * [.dial(...args)](#module_call.Call+dial) ⇒ <code>Dial</code>
            * [.hangup()](#module_call.Call+hangup) ⇒ <code>Hangup</code>
            * [.reject(...args)](#module_call.Call+reject) ⇒ <code>Reject</code>
            * [.sendResponse()](#module_call.Call+sendResponse) ⇒ <code>Promise</code>
            * [.sendFinalResponse()](#module_call.Call+sendFinalResponse) ⇒ <code>Promise</code>
            * [.nextEvent()](#module_call.Call+nextEvent) ⇒ <code>Promise</code>
        * _static_
            * [.propertyMappings](#module_call.Call.propertyMappings)
            * [.makeCall(to, from, [options])](#module_call.Call.makeCall) ⇒ <code>Promise</code>
    * [.setup([options])](#module_call.setup) ⇒ <code>Promise</code>

<a name="module_call.CallEndedException"></a>

### call.CallEndedException
Used to indicate that a call has ended prematurely, before the end of a script has been reached.

**Kind**: static class of [<code>call</code>](#module_call)  
<a name="new_module_call.CallEndedException_new"></a>

#### new exports.CallEndedException(call)

| Param | Type | Description |
| --- | --- | --- |
| call | <code>Call</code> | The related Call object |

<a name="module_call.Call"></a>

### call.Call
Represents the state of a call. This class wraps a Twilio VoiceResponse object used to generate TwiML.
A Call object responds to webhooks and status callbacks, which settle a Promise that allows the next step 
in the script to be executed.
<br>
Call properties are derived from the results of an outbound API call, webhooks or status callbacks,
with the exceptions of eventSource and childCalls.  The most important ones are listed below. 
A definitive list is returned by the propertyMappings property.  Some properties are only applicable to childCalls.

**Kind**: static class of [<code>call</code>](#module_call)  

* [.Call](#module_call.Call)
    * _instance_
        * [.childCalls](#module_call.Call+childCalls)
        * [.eventSource](#module_call.Call+eventSource)
        * [.sid](#module_call.Call+sid)
        * [.dialCallSid](#module_call.Call+dialCallSid)
        * [.to](#module_call.Call+to)
        * [.from](#module_call.Call+from)
        * [.callerName](#module_call.Call+callerName)
        * [.status](#module_call.Call+status)
        * [.dialCallStatus](#module_call.Call+dialCallStatus)
        * [.answeredBy](#module_call.Call+answeredBy)
        * [.machineDetectionDuration](#module_call.Call+machineDetectionDuration)
        * [.callToken](#module_call.Call+callToken)
        * [.stirVerstat](#module_call.Call+stirVerstat)
        * [.stirPassportToken](#module_call.Call+stirPassportToken)
        * [.stirStatus](#module_call.Call+stirStatus)
        * [.direction](#module_call.Call+direction)
        * [.digits](#module_call.Call+digits)
        * [.finishedOnKey](#module_call.Call+finishedOnKey)
        * [.speechResult](#module_call.Call+speechResult)
        * [.confidence](#module_call.Call+confidence)
        * [.sipResponseCode](#module_call.Call+sipResponseCode)
        * [.errorCode](#module_call.Call+errorCode)
        * [.errorMessage](#module_call.Call+errorMessage)
        * [.cancel()](#module_call.Call+cancel) ⇒ <code>Promise</code>
        * [.say(...args)](#module_call.Call+say) ⇒ <code>Say</code>
        * [.play(...args)](#module_call.Call+play) ⇒ <code>Play</code>
        * [.pause(...args)](#module_call.Call+pause) ⇒ <code>Play</code>
        * [.gather(...args)](#module_call.Call+gather) ⇒ <code>Gather</code>
        * [.dial(...args)](#module_call.Call+dial) ⇒ <code>Dial</code>
        * [.hangup()](#module_call.Call+hangup) ⇒ <code>Hangup</code>
        * [.reject(...args)](#module_call.Call+reject) ⇒ <code>Reject</code>
        * [.sendResponse()](#module_call.Call+sendResponse) ⇒ <code>Promise</code>
        * [.sendFinalResponse()](#module_call.Call+sendFinalResponse) ⇒ <code>Promise</code>
        * [.nextEvent()](#module_call.Call+nextEvent) ⇒ <code>Promise</code>
    * _static_
        * [.propertyMappings](#module_call.Call.propertyMappings)
        * [.makeCall(to, from, [options])](#module_call.Call.makeCall) ⇒ <code>Promise</code>

<a name="module_call.Call+childCalls"></a>

#### call.childCalls
Array of dialed (child) calls

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+eventSource"></a>

#### call.eventSource
The source of the last event that updated the Call properties: ['api', 'webhook', 'status', 'dial', 'incoming']

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+sid"></a>

#### call.sid
The call SID.  See [https://support.twilio.com/hc/en-us/articles/223180488-What-is-a-Call-SID-](https://support.twilio.com/hc/en-us/articles/223180488-What-is-a-Call-SID-)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+dialCallSid"></a>

#### call.dialCallSid
The SID of the dialed (child) call.  Property of the child call.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+to"></a>

#### call.to
The destination number, SIP URI or PV client id

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+from"></a>

#### call.from
The originating number, SIP URI or PV client id

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+callerName"></a>

#### call.callerName
The display name of the caller

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+status"></a>

#### call.status
The status of the call: 
['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'canceled', 'failed']  
<br>See [https://support.twilio.com/hc/en-us/articles/223132547-What-are-the-Possible-Call-Statuses-and-What-do-They-Mean-](https://support.twilio.com/hc/en-us/articles/223132547-What-are-the-Possible-Call-Statuses-and-What-do-They-Mean-)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+dialCallStatus"></a>

#### call.dialCallStatus
The status of a child call: [initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'canceled', 'failed']
<br>See [https://support.twilio.com/hc/en-us/articles/223132547-What-are-the-Possible-Call-Statuses-and-What-do-They-Mean-](https://support.twilio.com/hc/en-us/articles/223132547-What-are-the-Possible-Call-Statuses-and-What-do-They-Mean-)
<br> Property of the child call.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+answeredBy"></a>

#### call.answeredBy
Who or what answered the call: 
['human', 'fax', 'machine_start', 'machine_end_beep', 'machine_end_silence', 'machine_end_other', 'unknown']
<br>See [https://www.twilio.com/docs/voice/answering-machine-detection](https://www.twilio.com/docs/voice/answering-machine-detection)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+machineDetectionDuration"></a>

#### call.machineDetectionDuration
The number of milliseconds taken to determine whether a human or machine answered the call.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+callToken"></a>

#### call.callToken
Call token received on an inbound call leg, which can be used for an outbound API call.
<br>[More...](https://www.twilio.com/docs/voice/trusted-calling-with-shakenstir#call-forwarding-coming-later)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+stirVerstat"></a>

#### call.stirVerstat
SHAKEN/STIR attestation for an inbound call, if present:
['TN-Validation-Passed-A', 'TN-Validation-Passed-B', 'TN-Validation-Passed-C', 
 'TN-Validation-Failed-A', 'TN-Validation-Failed-B', 'TN-Validation-Failed-C', 'No-TN-Validation', 'NULL']
<br>[More...](https://www.twilio.com/docs/voice/trusted-calling-with-shakenstir#changes-for-twilio-customers)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+stirPassportToken"></a>

#### call.stirPassportToken
JSON Web Token form of the SHAKEN Passport for an inbound call, if present.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+stirStatus"></a>

#### call.stirStatus
SHAKEN/STIR attestation given to an outbound call: ['A', 'B', 'C'], if present.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+direction"></a>

#### call.direction
Direction of the call: ['inbound', 'outbound-api', 'outbound-dial']

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+digits"></a>

#### call.digits
DTMF (keypress) digits collected from a Gather operation.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+finishedOnKey"></a>

#### call.finishedOnKey
Keypress that finished a Gather operation.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+speechResult"></a>

#### call.speechResult
Text returned by Gather speech recognition.
[More...](https://www.twilio.com/docs/voice/twiml/gather#action)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+confidence"></a>

#### call.confidence
Confidence level of Gather speech recognition, between 0.0 and 1.0.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+sipResponseCode"></a>

#### call.sipResponseCode
SIP response code that indicates the final status of an outbound call.

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+errorCode"></a>

#### call.errorCode
Error code generated by a failed call.  
See [Twilio Errors and Warnings Dictonary](https://www.twilio.com/docs/api/errors)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+errorMessage"></a>

#### call.errorMessage
Short warning generated by a failed call.
See [Twilio Errors and Warnings Dictonary](https://www.twilio.com/docs/api/errors)

**Kind**: instance property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call+cancel"></a>

#### call.cancel() ⇒ <code>Promise</code>
Cancels an outbound call that has not yet been answered.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Promise</code> - - Promise that resolves to a Call object  
<a name="module_call.Call+say"></a>

#### call.say(...args) ⇒ <code>Say</code>
Calls the say() method of the wrapped VoiceResponse object.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Say</code> - - See [VoiceResponse.Say](https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#say)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | See [https://www.twilio.com/docs/voice/twiml/say](https://www.twilio.com/docs/voice/twiml/say) |

<a name="module_call.Call+play"></a>

#### call.play(...args) ⇒ <code>Play</code>
Calls the play() method of the wrapped VoiceResponse object.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Play</code> - - See [VoiceResponse.Play](https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#play)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | @see [https://www.twilio.com/docs/voice/twiml/play](https://www.twilio.com/docs/voice/twiml/play) |

<a name="module_call.Call+pause"></a>

#### call.pause(...args) ⇒ <code>Play</code>
Calls the pause() method of the wrapped VoiceResponse object.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Play</code> - - See [VoiceResponse.Pause](https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#pause)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | @see [https://www.twilio.com/docs/voice/twiml/pause](https://www.twilio.com/docs/voice/twiml/pause) |

<a name="module_call.Call+gather"></a>

#### call.gather(...args) ⇒ <code>Gather</code>
Calls the gather() method of the wrapped VoiceResponse object. Any previous gather properties are deleted.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Gather</code> - - See [VoiceResponse.Gather](https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#gather)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | See [https://www.twilio.com/docs/voice/twiml/gather](https://www.twilio.com/docs/voice/twiml/gather)                  DO NOT set the action URL; the callback will be handled automatically. |

<a name="module_call.Call+dial"></a>

#### call.dial(...args) ⇒ <code>Dial</code>
Calls the dial() method of the wrapped VoiceResponse object. There will always be a webhook at the
end of the dialed call, which is handled specially.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Dial</code> - - See [VoiceResponse.Dial](https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#dial)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | See [https://www.twilio.com/docs/voice/twiml/dial](https://www.twilio.com/docs/voice/twiml/dial)                  DO NOT set the action URL; the callback will be handled automatically. |

<a name="module_call.Call+hangup"></a>

#### call.hangup() ⇒ <code>Hangup</code>
Calls the hangup() method of the wrapped VoiceResponse object. The Call object's state is updated
to note that no forther webhooks should be expected after the response has been sent.
See [https://www.twilio.com/docs/voice/twiml/hangup](https://www.twilio.com/docs/voice/twiml/hangup)

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Hangup</code> - - See [VoiceResponse.Hangup](https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#hangup)  
<a name="module_call.Call+reject"></a>

#### call.reject(...args) ⇒ <code>Reject</code>
Calls the reject() method of the wrapped VoiceResponse object. The Call object's state is updated
to note that no forther webhooks should be expected after the response has been sent.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Reject</code> - - See [VoiceResponse.Reject](https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#reject)  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | See [https://www.twilio.com/docs/voice/twiml/reject](https://www.twilio.com/docs/voice/twiml/reject) |

<a name="module_call.Call+sendResponse"></a>

#### call.sendResponse() ⇒ <code>Promise</code>
Generates the accumulated TwiML from the wrapped VoiceResponse object, and signals to the webhook handler
that it is ready to be sent. If this is a non-final response, a <Redirect> is added to the end of the TwiML
to ensure that control is returned to the script.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Promise</code> - - Promise that will be settled by the next webhook or status callback  
<a name="module_call.Call+sendFinalResponse"></a>

#### call.sendFinalResponse() ⇒ <code>Promise</code>
Generates the accumulated TwiML from the wrapped VoiceResponse object, and signals to the webhook handler
that it is ready to be sent. This will be the final TwiML response generated by the script.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Promise</code> - - Promise that will be settled by the next webhook or status callback  
<a name="module_call.Call+nextEvent"></a>

#### call.nextEvent() ⇒ <code>Promise</code>
Method to be called after receiving an 'initiated', 'ringing' or 'call-progress' event, 
which creates a new Promise to get either the next event or the webhook to receive TwiML.

**Kind**: instance method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Promise</code> - - Promise that resolves to the Call object.  
<a name="module_call.Call.propertyMappings"></a>

#### Call.propertyMappings
Defines the webhook and status callback parameters of interest, and which
normalizes their names when they are used to create properties of a Call object.

**Kind**: static property of [<code>Call</code>](#module_call.Call)  
<a name="module_call.Call.makeCall"></a>

#### Call.makeCall(to, from, [options]) ⇒ <code>Promise</code>
Factory method to create an outbound call.

**Kind**: static method of [<code>Call</code>](#module_call.Call)  
**Returns**: <code>Promise</code> - - Promise that resolves to the Call object  
**See**: [https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource](https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource)
                DO NOT set the twiml, url or statusCallback properties, as these will be handled automatically.  

| Param | Type | Description |
| --- | --- | --- |
| to | <code>string</code> | To number, SIP URI or Programmable Voice Client id |
| from | <code>string</code> | From number |
| [options] | <code>Object</code> | Call options, including recording, answering machine detection, etc. |

<a name="module_call.setup"></a>

### call.setup([options]) ⇒ <code>Promise</code>
Configures the Express server and sets it running. If no URL is specified, 
an attempt is made to use a locally running Ngrok tunnel.

**Kind**: static method of [<code>call</code>](#module_call)  
**Returns**: <code>Promise</code> - - Promise resolved when server has been started  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Options |
| [options.client] | <code>Object</code> | Client with which to access the Twilio REST API. Created from TWILIO_ACCOUNT_SID, TWILIO_API_KEY and TWILIO_API_SECRET if not specified. |
| [options.serverUrl] | <code>string</code> | Server URL for webhooks and callbacks. If not specified, uses Ngrok tunnel public URL. |
| [options.port] | <code>string</code> | Server TCP port. If not specified, uses Ngrok local port,  or 3000 if not using Ngrok. |
| [options.script] | <code>function</code> | Function to invoke upon post to '/inbound' webhook |
| [options.phoneNumber] | <code>string</code> | Configures a Twilio phone number to handle inbound calls |

<a name="module_client"></a>

## client
The client module provides support for creating a Twilio API client.  The getClient() function will accept 
an account SID and API key+secret, or else it will look for the standard environment variables TWILIO_ACCOUNT_SID, 
TWILIO_API_KEY and TWILIO_API_SECRET, first in the operating system environment, and then in the Node.js .env file.

<a name="module_client.getClient"></a>

### client.getClient([accountSid], [apiKey], [apiSecret]) ⇒ <code>Object</code>
Function which creates a Twilio client object from a set of account credentials.

**Kind**: static method of [<code>client</code>](#module_client)  
**Returns**: <code>Object</code> - - Client object  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [accountSid] | <code>string</code> | <code>&quot;process.env.TWILIO_API_SECRET&quot;</code> | Account SID |
| [apiKey] | <code>string</code> | <code>&quot;process.env.TWILIO_API_KEY&quot;</code> | API key |
| [apiSecret] | <code>string</code> | <code>&quot;process.env.TWILIO_API_SECRET&quot;</code> | API secret |

<a name="module_ngrok"></a>

## ngrok
Queries the local Ngrok Agent API to get tunnel information.

**See**: [https://ngrok.com/docs/ngrok-agent/api/](https://ngrok.com/docs/ngrok-agent/api/)  
<a name="module_ngrok.getTunnelInfo"></a>

### ngrok.getTunnelInfo() ⇒ <code>Promise</code>
Gets information about an Ngrok tunnel from the Ngrok Agent local API, if it is running.

**Kind**: static method of [<code>ngrok</code>](#module_ngrok)  
**Returns**: <code>Promise</code> - - Returns an object containing {publicUrl, localPort} when the Promise is resolved  
<a name="module_phonenumbers"></a>

## phonenumbers
This module provides a wrapper around libphonenumber-js, to allow parsing of phone numbers using the 
local machine's locale as the default.

**See**: https://gitlab.com/catamphetamine/libphonenumber  

* [phonenumbers](#module_phonenumbers)
    * [.parsePN(pn, countryCode)](#module_phonenumbers.parsePN) ⇒ <code>string</code>
    * [.nationalPN(pn)](#module_phonenumbers.nationalPN) ⇒ <code>string</code>

<a name="module_phonenumbers.parsePN"></a>

### phonenumbers.parsePN(pn, countryCode) ⇒ <code>string</code>
Parses a phone number, possibly including spaces and punctuation, taking into account local dialing conventions.

**Kind**: static method of [<code>phonenumbers</code>](#module_phonenumbers)  
**Returns**: <code>string</code> - - E.164 (international) format phone number, with no punctuation  

| Param | Type | Description |
| --- | --- | --- |
| pn | <code>string</code> | The phone number to parse |
| countryCode | <code>string</code> | Two-letter ISO 3166 country code; defaults to locale of local machine |

<a name="module_phonenumbers.nationalPN"></a>

### phonenumbers.nationalPN(pn) ⇒ <code>string</code>
Returns a phone number in national, friendly format.

**Kind**: static method of [<code>phonenumbers</code>](#module_phonenumbers)  
**Returns**: <code>string</code> - - The phone number in national format  

| Param | Type | Description |
| --- | --- | --- |
| pn | <code>string</code> | The phone number in E.164 format |

<a name="module_timeout"></a>

## timeout
Provides classes for applying timeouts to async operations.

**Example**  
```js
await new Timeout(2000).wait();  // wait 2000 milliseconds
// then do something
```
**Example**  
```js
try {
    response = await new Timeout(2000, "Fetch timed out").apply(fetch(url));
    // process fetch results
} catch (err) {
    if (err instanceof TimeoutException) console.log(err.message);
    else throw err;
}
```

* [timeout](#module_timeout)
    * [.TimeoutException](#module_timeout.TimeoutException)
    * [.Timeout](#module_timeout.Timeout)
        * [new exports.Timeout(delay, reason)](#new_module_timeout.Timeout_new)
        * [.apply(promise)](#module_timeout.Timeout+apply) ⇒ <code>Promise</code>
        * [.wait()](#module_timeout.Timeout+wait) ⇒ <code>Promise</code>

<a name="module_timeout.TimeoutException"></a>

### timeout.TimeoutException
Helper class used to distinguish timeouts from other kinds of error.

**Kind**: static class of [<code>timeout</code>](#module_timeout)  
<a name="module_timeout.Timeout"></a>

### timeout.Timeout
Simple class that wraps a Promise around a timer, so that the timer can be awaited.

**Kind**: static class of [<code>timeout</code>](#module_timeout)  

* [.Timeout](#module_timeout.Timeout)
    * [new exports.Timeout(delay, reason)](#new_module_timeout.Timeout_new)
    * [.apply(promise)](#module_timeout.Timeout+apply) ⇒ <code>Promise</code>
    * [.wait()](#module_timeout.Timeout+wait) ⇒ <code>Promise</code>

<a name="new_module_timeout.Timeout_new"></a>

#### new exports.Timeout(delay, reason)
Constructor.


| Param | Type | Description |
| --- | --- | --- |
| delay | <code>int</code> | Delay in milliseconds |
| reason | <code>string</code> | Message passed to TimeoutException; the Promise will be rejected, if set.                           If omitted, the Promise will be fulfilled. |

<a name="module_timeout.Timeout+apply"></a>

#### timeout.apply(promise) ⇒ <code>Promise</code>
Applies the timeout to some operation that will be completed when its Promise is fulfilled.  
If the operation times out, the Timeout will reject with a TimeoutException.

**Kind**: instance method of [<code>Timeout</code>](#module_timeout.Timeout)  
**Returns**: <code>Promise</code> - - Either the timeout, upon rejection, or the input Promise, upon fulfillment.  

| Param | Type | Description |
| --- | --- | --- |
| promise | <code>Promise</code> | The timeout will be applied to this Promise |

<a name="module_timeout.Timeout+wait"></a>

#### timeout.wait() ⇒ <code>Promise</code>
Waits for the Timeout.

**Kind**: instance method of [<code>Timeout</code>](#module_timeout.Timeout)  
**Returns**: <code>Promise</code> - that fulfills (or rejects) when the Timeout expires.  
