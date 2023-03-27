/**
 * This is a sample application to demonstrate the use of Voice scripting using the Call module. It is an
 * appointment reminder script, where a patient is called about an upcoming appointment and asked to confirm,
 * cancel or reschedule it.
 * 
 * To run the script, use the following command:
 * 
 *   node apptreminder.js dataset_name
 * 
 * where:
 *   dataset_name is used to look up a named object in the datasets.js file, containing the details of the
 *   appointment. You should edit the file to provide your own datasets.
 * 
 * If you are using Ngrok, make sure you have started the Ngrok agent. If not, modify the setup() call to provide
 * your web server URL.
 */

import {Call, CallEndedException, setup} from '../call.js';
import { datasets } from './datasets.js';


async function script(dataset) {
    let call;
    try {
        call = await Call.makeCall(dataset.to, dataset.from);

        if (call.status == 'in-progress') {
            call.pause(4);
            call.say(`This is an appointment reminder message for ${dataset.patient}`);
            await call.sendResponse();
    
            let gatherSuccess = false;
            loop: for (let numTries = 0; numTries < 3; numTries++) {
                call.gather({numDigits: 1, finishOnKey: ''})
                    .say(`You have an appointment with ${dataset.doctor}, on ${dataset.date}, at ${dataset.time} . ` +
                         'Please press 1 to confirm your appointment, 2 to cancel, or 3 to reschedule. ' + 
                         'Press star to hear this message again.');
                await call.sendResponse();
    
                switch (call.digits) {
                    case '*':
                        numTries = 0;  // Reset the loop counter if repeat requested
                        continue;
    
                    case '1':
                        gatherSuccess = true;
                        dataset.outcome = 'confirmed';
                        call.say('Thank you for confirming your appointment. Goodbye.');
                        call.hangup();
                        await call.sendResponse();
                        break loop;
    
                    case '2':
                        gatherSuccess = true;
                        dataset.outcome = 'canceled';
                        call.say('Thank you. We will cancel your appointment. Goodbye.');
                        call.hangup();
                        await call.sendResponse();
                        break loop;
        
                    case '3':
                        gatherSuccess = true;
                        call.say(`Connecting you to ${dataset.doctor}'s office`);
                        call.dial(dataset.forward);
                        await call.sendResponse();
                        const status = call.childCalls[0].dialCallStatus;
                        if (status == 'completed') {
                            dataset.outcome = 'transferred';
                        } else {
                            dataset.outcome = 'transfer failed';
                            dataset.reason = status;
                            call.say('Sorry, we were unable to transfer your call. Goodbye.')
                        }
                        call.hangup();
                        await call.sendResponse();
                        break loop;
        
                    default: break;
                }
            }
    
            if (!gatherSuccess) {
                dataset.outcome = 'no response';
                call.say('We did not get your response. Goodbye.');
                call.hangup();
                await call.sendResponse();
            }

        } else {
            dataset.outcome = 'no answer';
            dataset.reason = call.status;
            dataset.sipCode = call.sipResponseCode;
        }

    } catch (err) {
        if (err instanceof CallEndedException) {
            dataset.outcome = 'hung up';
        } else {
            dataset.outcome = 'failed';
            dataset.reason = err.message;
        }

    } finally {
        console.log(dataset);  // Log outcome.
    }
}


const args = process.argv.slice(2);
if (args.length == 0) {
    console.error('Usage: node apptreminder.js dataset_name');
} else if (datasets.has(args[0])) {
    setup()
        .then(() => script(datasets.get(args[0])))
        .then(() => process.exit(0));  // Shuts down the web server
} else {
    console.error(`Appointment dataset ${args[0]} could not be found`);
}
