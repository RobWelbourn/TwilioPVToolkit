/**
 * @module call
 * 
 * The call module provides classes for call handling and manages an Express web server to handle the associated
 * webhooks and status callbacks. It exports the following:
 * 
 * 1. The Call class, which encapsulates a running call and its state. It wraps a Twilio VoiceResponse object that is
 *    used to generate TwiML in response to webhooks.
 * 
 * 2. The CallEndedException class, which is used to indicate that a call has ended prematurely, usually because the far
 *    end has hung up before a script has finished executing.
 * 
 * 3. The setup() function, which is used to start the Express web server. It is also used to supply account credentials.
 */

import express from 'express';
import log from 'loglevel';
import Twilio from 'twilio';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse.js';
import { getTunnelInfo } from './utils/ngrok.js';

const logLevel = process.env.DEBUG;
log.setLevel(logLevel ? logLevel : 'info');

const DEFAULT_PORT = 3000;

let accountSid;
let apiKey;
let apiSecret;
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
 */
export class Call {
    #webhookResolve;            // Permits the next step in the script to execute
    #webhookReject;             // Called in the event of the other end hanging up prematurely, or some other failure
    #twimlResolve;              // Called when new TwiML is available to be returned by a webhook
    #twimlReject;               // Would indicate an internal failure in response to a webhook; not currently used
    #voiceResponse;             // Wrapped VoiceResponse object, used to generate TwiML
    #scriptContinues = true;    // True when more TwiML is to be returned
    #childCalls = [];           // Array of child calls

    /*
     * Do not call directly. Use the factory method Call.makeCall() instead.
     */
    constructor(properties, webhookResolve, webhookReject) {
        this.#updateProperties(properties);
        this.#webhookResolve = webhookResolve;
        this.#webhookReject = webhookReject;
        this.#voiceResponse = new VoiceResponse();
    }

    /*
     * Validates options passed to makeCall() and various TwiML-generating verbs, to ensure compatibility
     * with how the Call module works.
     */
    static #validateOptions(options) {
        if (options) {
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
                }
            }
        }
        return options;
    }

    /**
     * @readonly @property Returns an array of child calls
     */
    get childCalls() { return this.#childCalls; }
    
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
        options = Call.#validateOptions(options);
        return new Promise((resolve, reject) => {
            client.calls
                .create({
                    to,
                    from,
                    ...options,
                    url: `${serverUrl}/webhook`,
                    statusCallback: `${serverUrl}/status`
                })
                .then(call => currentCalls[call.sid] = new Call(call, resolve, reject))
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
     * @readonly @property Defines the webhook and status callback parameters of interest, and which
     * normalizes their names when they are used to create properties of a Call object.
     */
    static get propertyMappings() {
        return {
            sid: 'sid',
            CallSid: 'sid',
            dateCreated: 'dateCreated',
            dateUpdated: 'dateUpdated',
            parentCallSid: 'parentCallSid',
            accountSid: 'accountSid',
            to: 'to',
            To: 'to',
            toFormatted: 'toFormatted',
            from: 'from',
            From: 'from',
            fromFormatted: 'fromFormatted',
            callerName: 'callerName',
            CallerName: 'callerName',
            phoneNumberSid: 'phoneNumberSid',
            status: 'status',
            CallStatus: 'status',
            startTime: 'startTime',
            endTime: 'endTime',
            duration: 'duration',
            Duration: 'duration',
            CallDuration: 'callDuration',
            price: 'price',
            priceUnit: 'priceUnit',
            direction: 'direction',
            answeredBy: 'answeredBy',
            forwardedFrom: 'forwardedFrom',
            groupSid: 'groupSid',
            queueTime: 'queueTime',
            trunkSid: 'trunkSid',
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
            AnsweredBy: 'answeredBy',
            MachineDetectionDuration: 'machineDetectionDuration',
            DialCallStatus: 'dialCallStatus',
            DialCallSid: 'dialCallSid',
            DialCallDuration: 'dialCallDuration',
            DialBridged: 'dialBridged',
            RecordingUrl: 'recordingUrl',
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
        this.#childCalls.push(childProperties);
    }

    /**
     * Calls the say() method of the wrapped VoiceResponse object.
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/say}
     * @returns {Say} - @see {@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#say}
     */
    say(...args) { return this.#voiceResponse.say(...args); }

    /**
     * Calls the play() method of the wrapped VoiceResponse object.
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/play}
     * @returns {Play} - @see {@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#play}
     */
    play(...args) { return this.#voiceResponse.play(...args); }

    /**
     * Calls the pause() method of the wrapped VoiceResponse object.
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/pause}
     * @returns {Play} - @see {@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#pause}
     */
    pause(...args) { return this.#voiceResponse.pause(...args); }

    /**
     * Calls the gather() method of the wrapped VoiceResponse object. Any previous gather properties are deleted.
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/gather}
     *                  DO NOT set the action URL; the callback will be handled automatically.
     * @returns {Gather} - @see {@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#gather}
     */
    gather(...args) { 
        args = Call.#validateOptions(args);
        delete this.digits;
        delete this.finishedOnKey;
        delete this.speechResult;
        delete this.confidence;

        if (args.length == 0) {
            return this.#voiceResponse.gather({action: `${serverUrl}/webhook`});
        }else if (typeof args[0] == 'object') {
            args[0].action = `${serverUrl}/webhook`;
            return this.#voiceResponse.gather(...args);
        } else {
            return this.#voiceResponse.gather({action: `${serverUrl}/webhook`}, ...args);
        }
    }

    /**
     * Calls the dial() method of the wrapped VoiceResponse object. There will always be a webhook at the
     * end of the dialed call, which is handled specially.   
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/dial}
     *                  DO NOT set the action URL; the callback will be handled automatically.
     * @returns {Dial} - @see {@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#dial}
     */
    dial(...args) { 
        args = Call.#validateOptions(args);
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
     * @see {@link https://www.twilio.com/docs/voice/twiml/hangup}
     * @returns {Hangup} - @see {@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#hangup}
     */
    hangup() {
        this.#scriptContinues = false;
        return this.#voiceResponse.hangup();
    }

    /**
     * Calls the reject() method of the wrapped VoiceResponse object. The Call object's state is updated
     * to note that no forther webhooks should be expected after the response has been sent.
     * @param  {...any} args - @see {@link https://www.twilio.com/docs/voice/twiml/reject}
     * @returns {Reject} - @see {@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html#reject}
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
        return new Promise((resolve, reject) => {
            if (this.#scriptContinues) {                    // If this is not the last step...
                this.#voiceResponse.redirect(`${serverUrl}/webhook`); // Make sure Twilio returns control to the script for the next step
            }
            const twiml = this.#voiceResponse.toString();
            this.#twimlResolve(twiml);                      // Resolves Promise to send back some TwiML
            this.#webhookResolve = resolve;                 // Waits for the next webhook or status callback
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
        return new Promise((resolve, reject) => {
            this.#scriptContinues = false;
            const twiml = this.#voiceResponse.toString();
            this.#twimlResolve(twiml);                      // Resolves Promise to send back some TwiML
            this.#webhookResolve = resolve;                 // Waits for the next webhook or status callback
            this.#webhookReject = reject;                   // Fired if the other end hangs up
        });
    }

    /**
     * Method to be called after receiving an 'initiated', 'ringing' or 'call-progress' event, 
     * which creates a new Promise to get either the next event or the webhook to receive TwiML.
     * @returns {Promise} - Promise that resolves to the Call object.
     */
    nextEvent() {
        return new Promise((resolve, reject) => {
            this.#webhookResolve = resolve;
            this.#webhookReject = reject;
        })
    }

    /*
     * Called by a webhook to request the next TwiML response.
     * Returns a Promise that is settled when the next script step invokes sendResponse().
     */
    #getTwiml(response) {
        return new Promise((resolve, reject) => {
            this.#twimlResolve = resolve;                   // Waits for the next step in the script
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
        this.#webhookResolve(this);
        this.#getTwiml(response);
    }

    /*
     * Signals a call progress event to the script.  If this was an expected hangup, 
     * the script Promise is resolved. Otherwise, the script Promise is rejected with a CallEndedException.
     */
    _respondToStatusCallback(request, response) {
        this.#updateProperties(request.body);
        switch (this.status) {
            case 'canceled':
            case 'busy':
            case 'no-answer':
            case 'failed':
                this.#webhookResolve(this);
                delete currentCalls[this.sid];
                break;

            case 'completed':
                if (this.#scriptContinues) {
                    this.#webhookReject(new CallEndedException(this));
                } else {
                    this.#webhookResolve(this);
                }
                delete currentCalls[this.sid];
                break;

            case 'initiated':
            case 'ringing':
            case 'in-progress':
                this.#webhookResolve(this);
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
        this.#webhookResolve(this);
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
 * Handles the end-of-call status callback.
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
        log.debug('Parent call', sid, 'not found in current calls');
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
        currentCalls[sid] = call;
        call._respondToInboundCall(response);
        inboundScript(call);
    } else {
        log.warn('Inbound call webhook did not contain a call SID');
        response.status(400).end(); 
    }
});


/**
 * Setup function which passes in account credentials and server details, and which sets the
 * Express server running. If no server details are specified, the function attempts to locate
 * a locally running Ngrok tunnel and use its details.
 * @param {Object} [options] - Options
 * @param {string} [options.accounSid=process.env.TWILIO_ACCOUNT_SID] - Account SID
 * @param {string} [options.apiKey=process.env.TWILIO_API_KEY] - API key SID
 * @param {string} [options.apiSecret=process.env.TWILIO_API_SECRET] - API key secret
 * @param {string} [options.serverUrl=Ngrok tunnel public URL] - Server URL for webhooks and callbacks
 * @param {string} [options.port=Ngrok local port, or 3000 if not using Ngrok] - Server TCP port
 * @param {Function} [options.script] - Function to invoke upon post to '/inbound' webhook
 * @returns {Promise} - Promise resolved when server has been started
 */
export async function setup(options) {
    options = options || {};
    accountSid = options.accountSid || process.env.TWILIO_ACCOUNT_SID;
    apiKey = options.apiKey || process.env.TWILIO_API_KEY;
    apiSecret = options.apiSecret || process.env.TWILIO_API_SECRET;
    client = new Twilio(apiKey, apiSecret, {accountSid: accountSid});
    inboundScript = options.script || defaultInboundScript;

    if (options.serverUrl) {
        serverUrl = options.serverUrl;
        port = options.port || DEFAULT_PORT;
        app.listen(port, () => log.info(`Server running on port ${port}`));
    } else {
        return getTunnelInfo()
            .then(info => {
                serverUrl = info.publicUrl;
                port = info.localPort;
                log.info('Server URL:', serverUrl);
                app.listen(port, () => log.info(`Server running on port ${port}`));
            });
    }
}