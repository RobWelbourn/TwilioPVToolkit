/**
 * A simple example script for receiving an inbound call and collecting some information using an IVR.
 */

import {Call, CallEndedException, setup} from '../call.js';

const script = async function(call) {
    try {
        console.log('Call to', call.to, 'from', call.from);
        call.say('Welcome to the keypress tester');

        while (true) {
            const gather = call.gather();
            gather.say('Please press some digits, or pound to finish');
            await call.sendResponse();

            if (call.digits) {
                call.say(`You pressed ${call.digits.split('').join(' ')}`);
            } else {
                break;
            }
        }

        call.say('Thank you for your input. Goodbye!');
        await call.sendFinalResponse();

    } catch (err) {
        if (err instanceof CallEndedException) {
            console.log('Caller hung up');
        } else {
            console.error(err);
        }
    }
 }

setup({inboundScript: script})
    .then(() => console.log('Ready for calls'))
    .catch(err => console.error(err));