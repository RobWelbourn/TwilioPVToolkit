/**
 * This is a sample application to demonstrate the use of Voice scripting using the Call module. It simulates
 * a PagerDuty call flow, in which an automated system dials members of an on-call support team in turn, with
 * a message to deliver. Once the script finds a team member who acknowledges the message, the script stops.
 * 
 * To run the script, use the following command:
 * 
 *   node oncall.js team_name from_number "Message to deliver"
 * 
 * where:
 *   team_name is used to look up a Map in the datasets.js file containing a list of phone numbers and associated 
 *   team member names. You should edit the file to provide your own datasets.
 * 
 *   from_number should be a Twilio number in your account or a Verified Caller Id.
 * 
 *   "Message to deliver" should be replaced with your own message.
 * 
 * If you are using Ngrok, make sure you have started the Ngrok agent. If not, modify the setup() call to provide
 * your web server URL.
 */

import { Call, CallEndedException, setup } from '../call.js';
import { datasets } from './datasets.js';

const script = async function(team, fromNum, message) {
    let messageAcknowledged = false;

    for (let [number, name] of team) {
        try {
            const call = await Call.makeCall(number, fromNum);
    
            // If the call was answered...
            if (call.status == 'in-progress') {
                try {
                    // Let's see if we get a human to respond.
                    for (let numTries = 0; numTries < 2; numTries++) {
                        call.gather({numDigits: 1, finishOnKey: ''})
                            .say(`This is the on-call system with an important message for ${name} ` +
                                 'Please press any key to listen to the message');
                        await call.sendResponse();        
                        if (call.digits) break;
                    }
        
                    // No-one responded (maybe an answering machine), so try the next team member.
                    if (!call.digits) {
                        console.log(`${name} did not respond; hanging up`);
                        call.say('We did not get your response. Goodbye.');
                        call.hangup();
                        await call.sendResponse();
                        continue;
                    }
        
                    // Play the message until the team member acknowledges that they've heard it.
                    do {
                        call.say({voice: 'Polly.Brian-Neural'}, message);
                        call.gather({numDigits: 1, finishOnKey: ''})
                            .say('Press star to repeat the message, or 1 to acknowledge it');
                        await call.sendResponse();
        
                        switch (call.digits) {
                            case '*': continue;
                            case '1': 
                                messageAcknowledged = true;
                                break;
                            default: continue;
                        }
                    } while (messageAcknowledged == false);
        
                    console.log(`${name} has acknowledged the message`);
                    call.say('Thank you for responding. Goodbye.');
                    call.hangup();
                    await call.sendResponse();
                    break;
    
                } catch (err) {
                    // If the team member hung up before acknowledging the message, try the next member.
                    if (err instanceof CallEndedException) {
                        console.log(`${name} hung up without acknowledging the message`);
                    } else {
                        throw err;
                    }
                }
    
            } else {
                // Busy, no answer, call failed, etc.
                console.log(`${name} did not answer. Reason: ${call.status}; SIP code: ${call.sipResponseCode}`);
            }
        } catch (err) {
            // Most likely the Twilio REST API rejected the call attempt in Call.makeCall().
            console.error(`Call to ${name} failed: ${err.message}`);  
        }
    }
    if (!messageAcknowledged) {
        console.log('No-one responded to the message');
    }
}

const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node oncall.js team_name from_number "Message to deliver"');
} else if (datasets.has(args[0])) {
    const team = datasets.get(args[0]);
    const fromNum = args[1];
    const message = args[2];
    console.log('Team:', team);
    setup()
        .then(() => script(team, fromNum, message))
        .catch(err => console.error(err))
        .finally(() => process.exit(0));  // Shuts down the web server
} else {
    console.error(`Team dataset ${args[0]} could not be found`);
}