/**
 * This is a sample application to demonstrate the use of Voice scripting using the Call module. It allows an inbound
 * call to trigger a script, connecting the inbound call to a conference and then making calls in parallel to a group 
 * of prospective participants. The participants are prompted to join the conference through key-press input.
 * 
 * To run the script, use the following command:
 * 
 *   node conference.js group_name
 * 
 * where:
 *   group_name is used to look up a Map in the datasets.js file containing a list of phone numbers and associated 
 *   group member names. You should edit the file to provide your own datasets.
 * 
 * If you are using Ngrok, make sure you have started the Ngrok agent. If not, modify the setup() call to provide
 * your web server URL. You will need to configure a Twilio number to point to your webhook URL.
 */

import { Call, CallEndedException, setup } from '../call.js';
import { datasets } from './datasets.js';

const confName = 'MyConf';
let participants;

async function makeOutboundCall(to, from, responder, initiator, callToken) {
    let call;
    try {
        call = await Call.makeCall(to, from, {callToken});

        // If the call was answered...
        if (call.status == 'in-progress') {
    
            // Ask responder to join the conference.
            for (let numTries = 0; numTries < 2; numTries++) {
                call.gather({numDigits: 1, finishOnKey: ''})
                    .say(
                        `Hi ${responder}, ${initiator} is inviting you to join a conference call. ` +
                        'Please press 1 to accept, or any other key to decline');
                await call.sendResponse();
    
                if (call.digits === undefined) {
                    continue;  // No digits pressed

                } else if (call.digits == '1') {
                    console.log(responder, 'is joining the conference');
                    call.say('Connecting you to the conference');
                    call.dial().conference(confName);
                    call.sendFinalResponse()
                        .then(() => console.log(responder, 'has left the conference'));
                    return;

                } else {
                    console.log(responder, 'has declined to join')
                    call.say('Another time, maybe. Goodbye.')
                    call.hangup();
                    call.sendResponse();
                    return;
                }
            }
    
            // Most likely we got an answering machine.
            console.log(responder, 'has not responded');
            call.say('We did not get your response. Goodbye.')
            call.hangup();
            call.sendResponse();

        } else {
            // Busy, no answer, call failed, etc.
            console.log(`${responder} did not answer. Reason: ${call.status}; SIP code: ${call.sipResponseCode}`);
        }

    } catch (err) {
        if (err instanceof CallEndedException) {
            console.log(responder, 'hung up before joining');
        } else {
            // Most likely the Twilio REST API rejected the call attempt in Call.makeCall().
            console.error(`Call to ${responder} failed: ${err.message}`);  
        }
    }
}

const script = async function(call) {
    console.log('Inbound call to the conference line on', call.to);

    // If the caller is a member of the group...
    if (participants.has(call.from)) {
        // First, connect the inbound call to the conference.
        const initiator = participants.get(call.from);
        call.say(`Welcome, ${initiator}. Connecting you to your conference. Please wait while we dial the other participants.`);
        call.dial().conference(confName);
        call.sendResponse()             // No 'await' here because we can dial the other participants immediately
            .then(call => {             // This part gets executed after the initiator hangs up
                console.log(initiator, 'has left the conference');
                call.sendFinalResponse();
            });  
        console.log(`Connecting ${initiator} to the conference`);

        // Call the other members of the group. Note the use of the CallToken from the inbound call leg,
        // which allows the incoming caller id to be used for the outbound call legs. Note also that the outbound
        // calls are made in parallel, as the makeOutboundCall() function returns a Promise and does not block.
        for (let [number, name] of participants) {
            if (number != call.from) {
                makeOutboundCall(number, call.from, name, initiator, call.callToken)
            }
        }

    } else {
        console.warn(`Unknown caller ${call.from} called the conference line -- rejecting`);
        call.reject();
        call.sendResponse();
    }
}

const args = process.argv.slice(2);
if (args.length == 0) {
    console.error('Usage: node conference.js group_name');
} else if (datasets.has(args[0])) {
    participants = datasets.get(args[0]);
    console.log('Participants:', participants);
    setup({script})
        .then(() => console.log('Script is ready'))
        .catch(err => console.error(err));
} else {
    console.error(`Group dataset ${args[0]} could not be found`);
}