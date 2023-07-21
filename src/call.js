/**
 * @module call
 * 
 * @description The call module provides classes for call handling. It also configures and starts an Express web server 
 * to handle the associated webhooks and status callbacks. It exports the following:
 * 
 * 1. The Call class, which encapsulates a running call and its state. It wraps a Twilio VoiceResponse object that is
 * used to generate TwiML in response to webhooks.
 * 
 * 2. The CallEndedException class, which is used to indicate that a call has ended prematurely, usually because the far
 * end has hung up before a script has finished executing.
 * 
 * 3. The setup() function, which is used to configure and start the Express web server.
 */

import express from 'express';
import log from 'loglevel';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse.js';
import { getTunnelInfo } from './utils/ngrok.js';
import { getClient } from './utils/client.js';

const logLevel = process.env.DEBUG;
log.setLevel(logLevel ? logLevel : 'info');

const DEFAULT_PORT = 3000;

let client;
let port;
let serverUrl;
let inboundScript;

const defaultInboundScript = async function(call) {
    call.say("No inbound call handler has been registered. Goodbye.")
    call.hangup();
    await call.sendResponse();
}

const currentCalls = {};    // Associative array of current calls, indexed by call SID

/**
 * @classdesc
 * Used to indicate that a call has ended prematurely, before the end of a script has been reached.
 */
export class CallEndedException extends Error {
    /**
     * @constructs
     * @param {Call} call - The related Call object
     */
    constructor(call) {
        super();
        this.call = call;
    }
}

/**
 * @classdesc
 * Represents the state of a call. This class wraps a Twilio VoiceResponse object used to generate TwiML.
 * A Call object responds to webhooks and status callbacks, which settle a Promise that allows the next step 
 * in the script to be executed.
 * 
 * Call properties are derived from the results of an outbound API call, webhooks or status callbacks,
 * with the exceptions of eventSource and childCalls.  The most important ones are listed below. 
 * A definitive list is returned by the propertyMappings property.  Some properties are only applicable to childCalls.
 */
export class Call {
    #webhookFulfill;            // Permits the next step in the script to execute
    #webhookReject;             // Called in the event of the other end hanging up prematurely, or some other failure
    #twimlFulfill;              // Called when new TwiML is available to be returned by a webhook
    #twimlReject;               // Would indicate an internal failure in response to a webhook; not currently used
    #voiceResponse;             // Wrapped VoiceResponse object, used to generate TwiML
    #scriptContinues = true;    // True when more TwiML is to be returned

    /**  Array of dialed (child) calls  */
    childCalls = [];

    /**  The source of the last event that updated the Call properties: ['api', 'webhook', 'status', 'dial', 'incoming']  */
    eventSource;

    /**  The call SID.  See {@link https://support.twilio.com/hc/en-us/articles/223180488-What-is-a-Call-SID-}  */
    sid;

    /**  The SID of the dialed (child) call.  Property of the child call.  */
    dialCallSid;

    /**  The destination number, SIP URI or PV client id  */
    to;

    /**  The originating number, SIP URI or PV client id  */
    from;

    /**  The display name of the caller  */
    callerName;

    /**  
     * The status of the call: 
     * ['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'canceled', 'failed']  
     * <br>See {@link https://support.twilio.com/hc/en-us/articles/223132547-What-are-the-Possible-Call-Statuses-and-What-do-They-Mean-}
     * */
    status;

    /**
     * The status of a child call: [initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'canceled', 'failed']
     * <br>See {@link https://support.twilio.com/hc/en-us/articles/223132547-What-are-the-Possible-Call-Statuses-and-What-do-They-Mean-}
     * <br> Property of the child call.
     */
    dialCallStatus;

    /**  
     * Who or what answered the call: 
     * ['human', 'fax', 'machine_start', 'machine_end_beep', 'machine_end_silence', 'machine_end_other', 'unknown']
     * <br>See {@link https://www.twilio.com/docs/voice/answering-machine-detection}
     */
    answeredBy;

    /**  The number of milliseconds taken to determine whether a human or machine answered the call.  */
    machineDetectionDuration;

    /**  
     * Call token received on an inbound call leg, which can be used for an outbound API call.
     * <br>[More...]{@link https://www.twilio.com/docs/voice/trusted-calling-with-shakenstir#call-forwarding-coming-later}   
     */
    callToken;

    /**
     * SHAKEN/STIR attestation for an inbound call, if present:
     * ['TN-Validation-Passed-A', 'TN-Validation-Passed-B', 'TN-Validation-Passed-C', 
     *  'TN-Validation-Failed-A', 'TN-Validation-Failed-B', 'TN-Validation-Failed-C', 'No-TN-Validation', 'NULL']
     * <br>[More...]{@link https://www.twilio.com/docs/voice/trusted-calling-with-shakenstir#changes-for-twilio-customers}
     */
    stirVerstat;

    /**  JSON Web Token form of the SHAKEN Passport for an inbound call, if present.  */
    stirPassportToken;

    /**  SHAKEN/STIR attestation given to an outbound call: ['A', 'B', 'C'], if present.  */
    stirStatus;

    /**  Direction of the call: ['inbound', 'outbound-api', 'outbound-dial']  */
    direction;

    /**  DTMF (keypress) digits collected from a Gather operation.  */
    digits;

    /**  Keypress that finished a Gather operation.  */
    finishedOnKey;

    /**  
     * Text returned by Gather speech recognition.
     * [More...]{@link https://www.twilio.com/docs/voice/twiml/gather#action}  
     */
    speechResult;

    /**  Confidence level of Gather speech recognition, between 0.0 and 1.0.  */
    confidence;

    /**  SIP response code that indicates the final status of an outbound call.  */
    sipResponseCode;

    /**  
     * Error code generated by a failed call.  
     * See [Twilio Errors and Warnings Dictonary]{@link https://www.twilio.com/docs/api/errors}
     */
    errorCode;

    /**  
     * Short warning generated by a failed call.
     * See [Twilio Errors and Warnings Dictonary]{@link https://www.twilio.com/docs/api/errors}
     */
    errorMessage;

    /*
     * Do not call directly. Use the factory method Call.makeCall() instead.
     */
    constructor(properties, webhookFulfill, webhookReject) {
        this.#updateProperties(properties);
        this.#webhookFulfill = webhookFulfill;
        this.#webhookReject = webhookReject;
        this.#voiceResponse = new VoiceResponse();
    }

    /*
     * Validates options passed to makeCall() and various TwiML-generating verbs, to ensure compatibility
     * with how the Call module works.
     */
    static #validateOptions(options) {
        for (let option in options) {
            switch (option) {
                case 'accountSid':                  // In makeCall() and various <Dial> nouns...
                case 'method':
                case 'fallbackUrl':
                case 'fallbackMethod':
                case 'statusCallback':
                case 'statusCallbackMethod':
                case 'url':
                case 'twiml':
                case 'applicationSid':
                case 'action':                      // In <Dial> and <Gather>
                case 'partialResultsCallback':      // In <Gather>...
                case 'partialResultsCallbackMethod':
                case 'actionOnEmptyResult':
                    throw new Error(`${option} is not allowed in this context`, {cause: {option}});

                case 'to':                          // In makeCall()...
                case 'from':
                    throw new Error(`${option} in options duplicates the ${option} parameter`, {cause: {option}});

                case 'referUrl':                    // In <Dial>...
                case 'referMethod':
                    throw new Error('Refer is not currently supported', {cause: {option}});

                // If there's a list of statusCallback events, make sure 'completed' is included.
                case 'statusCallbackEvent':
                    if (!options.statusCallbackEvent.includes('completed')) {
                        options.statusCallbackEvent.push('completed');
                    }
                    break;

                // If async AMD is being invoked, set the callback URL.
                case 'asyncAmd':
                    options.asyncAmdStatusCallback = `${serverUrl}/amd`;
                    options.asyncAmdStatusCallbackMethod = 'POST';
                    break;  
            }
        }
    }
    
    /**
     * Factory method to create an outbound call.
     * @param {string} to - To number, SIP URI or Programmable Voice Client id
     * @param {string} from - From number
     * @param {Object} [options] - Call options, including recording, answering machine detection, etc.
     *                 @see {@link https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource}
     *                 DO NOT set the twiml, url or statusCallback properties, as these will be handled automatically.
     * @returns {Promise} - Promise that resolves to the Call object
     */
    static makeCall(to, from, options) {
        Call.#validateOptions(options);
        return new Promise((fulfill, reject) => {
            client.calls
                .create({
                    to,
                    from,
                    ...options,
                    url: `${serverUrl}/webhook?source=makeCall`,
                    statusCallback: `${serverUrl}/status`
                })
                .then(callProperties => {
                    const call = new Call(callProperties, fulfill, reject);
                    call.eventSource = 'api';
                    currentCalls[call.sid] = call;
                })
                .catch(err => reject(err));
        });
    }

    /**
     * Cancels an outbound call that has not yet been answered.
     * @returns {Promise} - Promise that resolves to a Call object
     */
    cancel() {
        this.#scriptContinues = false;
        return client.calls(this.sid)
            .update({status: 'completed'});
    }
    
    /**
     * Defines the webhook and status callback parameters of interest, and which
     * normalizes their names when they are used to create properties of a Call object.
     */
    static get propertyMappings() {
        return {
            sid: 'sid',
            CallSid: 'sid',
            parentCallSid: 'parentCallSid',
            to: 'to',
            To: 'to',
            from: 'from',
            From: 'from',
            callerName: 'callerName',
            CallerName: 'callerName',
            status: 'status',
            CallStatus: 'status',
            duration: 'duration',
            Duration: 'duration',
            direction: 'direction',
            forwardedFrom: 'forwardedFrom',
            queueTime: 'queueTime',
            StirStatus: 'stirStatus',
            StirVerstat: 'stirVerstat',
            StirPassportToken: 'stirPassportToken',
            CallToken: 'callToken',
            SipResponseCode: 'sipResponseCode',
            ErrorCode: 'errorCode',
            ErrorMessage: 'errorMessage',
            Digits: 'digits',
            FinishedOnKey: 'finishedOnKey',
            SpeechResult: 'speechResult',
            Confidence: 'confidence',
            answeredBy: 'answeredBy',
            AnsweredBy: 'answeredBy',
            MachineDetectionDuration: 'machineDetectionDuration',
            DialCallStatus: 'dialCallStatus',
            DialCallSid: 'dialCallSid',
            DialCallDuration: 'dialCallDuration',
        }
    } 

    /*
     * Updates the Call properties in response to webhook or status callback.
     */
    #updateProperties(properties) {
        for (let property in properties) {
            if (property in Call.propertyMappings) {
                this[Call.propertyMappings[property]] = properties[property];
            }
        }
    }

    /*
     * Appends an entry to childCalls[] and sets its properties from a status callback.
     */
    #updateChildProperties(properties) {
        const childProperties = {};
        for (let property in properties) {
            if (property in Call.propertyMappings) {
                childProperties[Call.propertyMappings[property]] = properties[property];
            }
        }
        this.childCalls.push(childProperties);
    }

    /**
     * Calls the say() method of the wrapped VoiceResponse object.
     * @param  {...any} args - See {@link https://www.twilio.com/docs/voice/twiml/say}
     * @returns {Say} - See [VoiceResponse.Say]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#say}
     */
    say(...args) { return this.#voiceResponse.say(...args); }

    /**
     * Calls the play() method of the wrapped VoiceResponse object.
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/play}
     * @returns {Play} - See [VoiceResponse.Play]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#play}
     */
    play(...args) { return this.#voiceResponse.play(...args); }

    /**
     * Calls the pause() method of the wrapped VoiceResponse object.
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/pause}
     * @returns {Play} - See [VoiceResponse.Pause]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#pause}
     */
    pause(...args) { return this.#voiceResponse.pause(...args); }

    /**
     * Calls the gather() method of the wrapped VoiceResponse object. Any previous gather properties are deleted.
     * @param  {...any} args - See {@link https://www.twilio.com/docs/voice/twiml/gather}
     *                  DO NOT set the action URL; the callback will be handled automatically.
     * @returns {Gather} - See [VoiceResponse.Gather]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#gather}
     */
    gather(...args) { 
        Call.#validateOptions(args);
        delete this.digits;
        delete this.finishedOnKey;
        delete this.speechResult;
        delete this.confidence;

        if (args.length == 0) {
            return this.#voiceResponse.gather({action: `${serverUrl}/webhook?source=gather`});
        }else if (typeof args[0] == 'object') {
            args[0].action = `${serverUrl}/webhook?source=gather`;
            return this.#voiceResponse.gather(...args);
        } else {
            return this.#voiceResponse.gather({action: `${serverUrl}/webhook?source=gather`}, ...args);
        }
    }

    /**
     * Calls the dial() method of the wrapped VoiceResponse object. There will always be a webhook at the
     * end of the dialed call, which is handled specially.   
     * @param  {...any} args - See {@link https://www.twilio.com/docs/voice/twiml/dial}
     *                  DO NOT set the action URL; the callback will be handled automatically.
     * @returns {Dial} - See [VoiceResponse.Dial]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#dial}
     */
    dial(...args) { 
        Call.#validateOptions(args);
        if (args.length == 0) {
            return this.#voiceResponse.dial({action: `${serverUrl}/dial`});
        } else if (typeof args[0] == 'object') {
            args[0].action = `${serverUrl}/dial`;
            return this.#voiceResponse.dial(...args);
        } else {
            return this.#voiceResponse.dial({action: `${serverUrl}/dial`}, ...args);
        }
    }

    /**
     * Calls the hangup() method of the wrapped VoiceResponse object. The Call object's state is updated
     * to note that no forther webhooks should be expected after the response has been sent.
     * See {@link https://www.twilio.com/docs/voice/twiml/hangup}
     * @returns {Hangup} - See [VoiceResponse.Hangup]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#hangup}
     */
    hangup() {
        this.#scriptContinues = false;
        return this.#voiceResponse.hangup();
    }

    /**
     * Calls the reject() method of the wrapped VoiceResponse object. The Call object's state is updated
     * to note that no forther webhooks should be expected after the response has been sent.
     * @param  {...any} args - See {@link https://www.twilio.com/docs/voice/twiml/reject}
     * @returns {Reject} - See [VoiceResponse.Reject]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#reject}
     */
    reject(...args) {
        this.#scriptContinues = false;
        return this.#voiceResponse.reject(...args);
    }

    /**
     * Generates the accumulated TwiML from the wrapped VoiceResponse object, and signals to the webhook handler
     * that it is ready to be sent. If this is a non-final response, a <Redirect> is added to the end of the TwiML
     * to ensure that control is returned to the script.
     * @returns {Promise} - Promise that will be settled by the next webhook or status callback
     */
    sendResponse() {
        return new Promise((fulfill, reject) => {
            if (this.#scriptContinues) {                    // If this is not the last step...
                this.#voiceResponse.redirect(`${serverUrl}/webhook?source=redirect`); // Make sure Twilio returns control to the script for the next step
            }
            const twiml = this.#voiceResponse.toString();
            this.#twimlFulfill(twiml);                      // Resolves Promise to send back some TwiML
            this.#webhookFulfill = fulfill;                 // Waits for the next webhook or status callback
            this.#webhookReject = reject;                   // Fired if the other end hangs up
            if (this.#scriptContinues) {
                this.#voiceResponse = new VoiceResponse();  // Creates a new VoiceResponse for the next step
            }
        });
    }

    /**
     * Generates the accumulated TwiML from the wrapped VoiceResponse object, and signals to the webhook handler
     * that it is ready to be sent. This will be the final TwiML response generated by the script.
     * @returns {Promise} - Promise that will be settled by the next webhook or status callback
     */
    sendFinalResponse() {
        return new Promise((fulfill, reject) => {
            this.#scriptContinues = false;
            const twiml = this.#voiceResponse.toString();
            this.#twimlFulfill(twiml);                      // Resolves Promise to send back some TwiML
            this.#webhookFulfill = fulfill;                 // Waits for the next webhook or status callback
            this.#webhookReject = reject;                   // Fired if the other end hangs up
        });
    }

    /**
     * Method to be called after receiving an 'initiated', 'ringing' or 'call-progress' event, 
     * which creates a new Promise to get either the next event or the webhook to receive TwiML.
     * @returns {Promise} - Promise that resolves to the Call object.
     */
    nextEvent() {
        return new Promise((fulfill, reject) => {
            this.#webhookFulfill = fulfill;
            this.#webhookReject = reject;
        })
    }

    /*
     * Called by a webhook to request the next TwiML response.
     * Returns a Promise that is settled when the next script step invokes sendResponse().
     */
    #getTwiml(response) {
        return new Promise((fulfill, reject) => {
            this.#twimlFulfill = fulfill;                   // Waits for the next step in the script
            this.#twimlReject = reject;                     // ...or if something goes horribly wrong
        })
        .then(twiml => {
            log.debug('TwiML:', twiml);
            response.type('xml').send(twiml).end()
        })
        .catch(err => response.status(502).send(err).end());
    }

    /*
     * Signals to the script that it can continue to the next step, and waits upon the resulting TwiML.
     */
    _respondToWebhook(request, response) {
        this.#updateProperties(request.body);
        this.eventSource = 'webhook';
        this.#webhookFulfill(this);
        this.#getTwiml(response);
    }

    /*
     * Signals a call progress event to the script.  If this was an expected hangup, 
     * the script Promise is resolved. Otherwise, the script Promise is rejected with a CallEndedException.
     */
    _respondToStatusCallback(request, response) {
        this.#updateProperties(request.body);
        this.eventSource = 'status';
        switch (this.status) {
            case 'canceled':
            case 'busy':
            case 'no-answer':
            case 'failed':
                this.#webhookFulfill(this);
                delete currentCalls[this.sid];
                break;

            case 'completed':
                if (this.#scriptContinues) {
                    this.#webhookReject(new CallEndedException(this));
                } else {
                    this.#webhookFulfill(this);
                }
                delete currentCalls[this.sid];
                break;

            case 'initiated':
            case 'ringing':
            case 'in-progress':
                this.#webhookFulfill(this);
                break;

            default:
                log.warn('Unexpected status event', this.status, 'for call', this.sid);
                break;
        }
        response.status(204).end();     
    }

    /*
     * Signals to the script that a child call has ended, and that it can continue to the next step. 
     * The webhook response waits upon the resulting TwiML, unless the script is finished, in which case
     * an empty response is sent immediately.
     */
    _respondToChildStatusCallback(request, response) {
        this.#updateChildProperties(request.body);
        this.eventSource = 'dial';
        this.#webhookFulfill(this);
        if (this.#scriptContinues) {
            this.#getTwiml(response);
        } else {
            const twiml = new VoiceResponse().toString();
            log.debug('TwiML:', twiml);
            response.type('xml').send(twiml).end();
        }
    }

    /*
     * Gets TwiML from a script in response to an inbound call.
     */
    _respondToInboundCall(response) {
        this.#getTwiml(response);
    }

    /*
     * Respond to an async AMD status callback.  We will simply set the variables in the Call
     * object, and the script can poll those values as required.
     */
    _respondToAmdStatusCallback(request, response) {
        this.#updateProperties(request.body);
        this.eventSource = 'asyncAmd';  
        response.status(204).end(); 
    }
}


const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));


/*
 * Handles the webhook to get the next step of the script.
 */
app.post('/webhook', (request, response) => {
    log.debug('Webhook:', request.body);
    const sid = request.body.CallSid;
    if (sid && sid in currentCalls) {
        currentCalls[sid]._respondToWebhook(request, response);
    } else {
        log.warn('Call', sid, 'not found in current calls');
        response.status(204).end(); 
    }
});

/*
 * Handles status callbacks.
 */
app.post('/status', (request, response) => {
    log.debug('Parent status:', request.body);
    const sid = request.body.CallSid;
    if (sid && sid in currentCalls) {
        currentCalls[sid]._respondToStatusCallback(request, response);
    } else {
        log.warn('Call', sid, 'not found in current calls');
        response.status(204).end(); 
    }
});

/*
 * Handles the status callback at the end of a child call (or if it fails, is busy,
 * or times out, etc).
 */
app.post('/dial', (request, response) => {
    log.debug('Child status:', request.body);
    const sid = request.body.CallSid;
    if (sid && sid in currentCalls) {
        currentCalls[sid]._respondToChildStatusCallback(request, response);
    } else {
        log.warn('Parent call', sid, 'not found in current calls');
        response.status(204).end(); 
    }
});

/*
 * Handles an inbound call by invoking the inboundScript function.
 */
app.post('/inbound', (request, response) => {
    log.debug('Inbound call:', request.body);
    const sid = request.body.CallSid;
    if (sid) {
        const call = new Call(request.body);
        call.eventSource = 'inbound';
        currentCalls[sid] = call;
        call._respondToInboundCall(response);
        inboundScript(call);
    } else {
        log.warn('Inbound call webhook did not contain a call SID');
        response.status(400).end(); 
    }
});

/*
 * Handles an asynchronous Answering Machine Detection status callback.
 */
app.post('/amd', (request, response) => {
    log.debug('Async AMD callback:', request.body);
    const sid = request.body.CallSid;
    if (sid && sid in currentCalls) {
        currentCalls[sid]._respondToAmdStatusCallback(request, response);
    } else {
        log.warn('Call', sid, 'not found in current calls');
        response.status(204).end(); 
    }
});


/**
 * Configures the Express server and sets it running. If no URL is specified, 
 * an attempt is made to use a locally running Ngrok tunnel. 
 * @param {Object} [options] - Options
 * @param {Object} [options.client] - Client with which to access the Twilio REST API.
 * Created from TWILIO_ACCOUNT_SID, TWILIO_API_KEY and TWILIO_API_SECRET if not specified.
 * @param {string} [options.serverUrl] - Server URL for webhooks and callbacks. If not specified, uses
 * Ngrok tunnel public URL.
 * @param {string} [options.port] - Server TCP port. If not specified, uses Ngrok local port, 
 * or 3000 if not using Ngrok.
 * @param {Function} [options.script] - Function to invoke upon post to '/inbound' webhook
 * @param {string} [options.phoneNumber] - Configures a Twilio phone number to handle inbound calls
 * @returns {Promise} - Promise resolved when server has been started
 */
export async function setup(options={}) {
    client = options.client || getClient();
    inboundScript = options.script || defaultInboundScript;

    if (options.serverUrl) {
        serverUrl = options.serverUrl;
        port = options.port || DEFAULT_PORT;
    } else {
        const info = await getTunnelInfo();
        serverUrl = info.publicUrl;
        port = info.localPort;
    }
    
    if (options.phoneNumber) {
        const matchingNums = await client.incomingPhoneNumbers.list({
            phoneNumber: options.phoneNumber
        });
        if (matchingNums.length != 1) {
            throw new Error(`Unable to configure ${options.phoneNumber}: not found in this account`);
        }
        const pn = await client.incomingPhoneNumbers(matchingNums[0].sid).update({
            voiceUrl: serverUrl + '/inbound'
        });
        log.info('Provisioned', pn.friendlyName, 'with voice URL', pn.voiceUrl);
    }
    
    app.listen(port, () => log.info('Server running on port', port, 'with URL', serverUrl));
}