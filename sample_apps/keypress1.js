/**
 * A simple example script for making an outbound call and collecting some information using an IVR.
 */

import {Call, CallEndedException, setup} from '../call.js';

async function script(to, from) {
    let call;
    try {
        console.log('Calling', to, 'from', from);
        call = await Call.makeCall(to, from);
        
        if (call.status == 'in-progress') {
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

        } else {
            console.log('Call was not answered. Reason:', call.status, 'SIP code:', call.sipResponseCode);
        }

    } catch (err) {
        if (err instanceof CallEndedException) {
            console.log('Called party hung up');
        } else {
            console.error(err);
        }   
    }
 }

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node keypress1.js to_number from_number');
} else {
    setup()
        .then(() => script(args[0], args[1]))
        .then(() => process.exit(0)); 
}