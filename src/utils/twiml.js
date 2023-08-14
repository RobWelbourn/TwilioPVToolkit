/**
 * @module twiml
 * 
 * @description Provides a factory function to create TwiML, containing a
 * [VoiceResponse]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html}
 * object with attribute validation that prevents "unsafe" TwiML from being created.
 */

import { getUrl } from '../call.js';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse.js';

// Support for these TwiML verbs has not yet been added.
const forbiddenVerbs = [
    'connect', 'echo', 'enqueue', 'leave', 'pay', 'record', 'redirect', 'refer', 'siprec', 'sms', 'stream'
];

// As above, but allow <Redirect> for use within the call module.
const forbiddenVerbsInternal = [
    'connect', 'echo', 'enqueue', 'leave', 'pay', 'record', 'refer', 'siprec', 'sms', 'stream'
];

// These attributes, found principally in <Gather>, <Dial> and <Dial>'s nouns, and in Call.makeCall(),
// are not yet supported. Setting the URLs in particular would conflict with the way the PV Toolkit works.
export const forbiddenAttributes = [
    'fallbackUrl',
    'fallbackMethod',
    'applicationSid',
    'action', 
    'partialResultsCallback', 
    'partialResultsCallbackMethod', 
    'actionOnEmptyResult',
    'method',
    'recordingStatusCallback',
    'recordingStatusCallbackMethod',
    'referUrl',
    'referMethod',
    'statusCallback',
    'statusCallbackMethod',
    'eventCallbackUrl',
    'url',
    'amdStatusCallback',
    'amdStatusCallbackMethod'
];

// Defines the structure of a Proxy object which validates and overrides TwiML attributes.
const proxyElements = {
    disallowed: forbiddenVerbs,
    errorMessage: ' is not currently supported',
    proxy: [
        { 
            name: 'gather',
            disallowed: forbiddenAttributes,
            actionUrl: 'webhook',
            errorMessage: ' attribute not allowed in <Gather>',
        },
        {
            name: 'dial',
            disallowed: forbiddenAttributes,
            actionUrl: 'dial',
            errorMessage: ' attribute not allowed in <Dial>',
            proxy: [
                {
                    name: 'number',
                    disallowed: forbiddenAttributes,
                    errorMessage: ' attribute not allowed in <Number>',
                },
                {
                    name: 'client',
                    disallowed: forbiddenAttributes,
                    errorMessage: ' attribute not allowed in <Client>',
                },
                {
                    name: 'sip',
                    disallowed: forbiddenAttributes,
                    errorMessage: ' attribute not allowed in <Sip>',
                },
                {
                    name: 'conference',
                    disallowed: forbiddenAttributes,
                    errorMessage: ' attribute not allowed in <Conference>',
                },
                {
                    name: 'queue',
                    disallowed: forbiddenAttributes,
                    errorMessage: ' attribute not allowed in <Queue>',
                },
            ]
        }
    ]
}

// Version of the above for use within the call module.
const proxyElementsInternal = Object.assign({}, proxyElements, { disallowed: forbiddenVerbsInternal });

/* 
 * The Proxy object which validates and overrides TwiML attributes.
 */
function getProxy(obj, node) {
    return new Proxy( 
        obj, 
        {
            get(target, property) {
                if (node.disallowed.includes(property)) {
                    throw new TypeError(`${property}${node.errorMessage}`);
                }
                if (node.proxy) {
                    for (let element of node.proxy) {
                        if (element.name === property)
                            return getProxy(target[property], element);
                    }
                }
                return target[property];
            },

            apply(target, receiver, args) {
                if (args.length > 0 && typeof args[0] === 'object') {
                    for (let attribute in args[0]) {
                        if (node.disallowed.includes(attribute))
                            throw new TypeError(`${attribute}${node.errorMessage}`);
                    }
                }
                if (node.actionUrl) {
                    const action = getUrl(node.actionUrl);
                    if (args.length == 0) {
                        args = [{ action }]
                    } else if (typeof args[0] === 'object') {
                        args[0].action = action;
                    } else if (typeof args[0] === 'string') {
                        args = [{ action }, args[0]];
                    }
                }
                return Reflect.apply(target, receiver, args);
            }
        }
    )
}

/**
 * Returns a
 * [VoiceResponse]{@link https://www.twilio.com/docs/libraries/reference/twilio-node/4.8.0/classes/twiml_VoiceResponse.export_-1.html} 
 * object, suitable for generating "safe" TwiML that does not break the PV Toolkit.
 * @returns { VoiceResponse } Proxied VoiceResponse object for generating TwiML
 */
export function makeTwiml() {
    return getProxy(new VoiceResponse(), proxyElements);
}

/*
 * Version of the above which allows <Redirect>, for use within the call module.
 */
export function _makeTwiml() {
    return getProxy(new VoiceResponse(), proxyElementsInternal);
}