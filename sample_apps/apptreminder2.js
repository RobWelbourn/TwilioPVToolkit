/**
 * This is a sample application to demonstrate the use of Voice scripting using the Call module. It is an
 * appointment reminder script, where a patient is called about an upcoming appointment and asked to confirm,
 * cancel or reschedule it.  This version of the script uses asynchromous Answering Machine Detection and
 * will leave a message if a human does not answer.
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

import { Call, CallEndedException, setup } from '../call.js';
import { Timeout } from '../utils/timeout.js';
import { nationalPN } from '../utils/phonenumbers.js';
import { datasets } from './datasets.js';


async function script(dataset) {
    let call;
    try {
        call = await Call.makeCall(
            dataset.to, 
            dataset.from, 
            {
                machineDetection: 'DetectMessageEnd', 
                asyncAmd: true,
                // record: true,            // Uncomment these lines when tuning
                // trim: 'do-not-trim'
            });
            
        if (call.status == 'in-progress') {
            call.pause({length: 3});        // Give a human the opportunity to say 'Hello'
            call.say(`Hello. This is an appointment reminder for ${dataset.patient}`);
            await call.sendResponse();
            
            // Wait for async AMD to deliver a verdict
            while (!call.answeredBy) {
                await new Timeout(1000).wait();  // Wait one second
            }
            
            if (call.answeredBy != 'human') {
                dataset.outcome = 'left message';
                const pn = nationalPN(dataset.forward);
                call.say(`This is an appointment reminder for ${dataset.patient} . ` +
                         `You have an appointment with ${dataset.doctor}, on ${dataset.date}, at ${dataset.time} . ` +
                         `I repeat, you have an appointment with ${dataset.doctor}, on ${dataset.date}, at ${dataset.time} . ` +
                         `If you wish to change or cancel your appointment, please call the doctor's office on ${pn} . ` +
                         `Again, if you wish to change or cancel your appointment, please call ${pn} .`);
                call.hangup();
                await call.sendResponse();

            } else {
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
    console.error('Usage: node apptreminder2.js dataset_name');
} else if (datasets.has(args[0])) {
    setup()
        .then(() => script(datasets.get(args[0])))
        .catch(err => console.error(err))
        .finally(() => process.exit(0));  // Shuts down the web server
} else {
    console.error(`Appointment dataset ${args[0]} could not be found`);
}
