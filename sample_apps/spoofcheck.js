/**
 * Demonstrator app to show how to check an inbound call for spoofed caller id.
 * 
 * We can assume that an inbound call with SHAKEN/STIR Attestation A is a legitimate call with valid caller id.
 * Otherwise, a probe call is made back to the putative caller, to see whether or not the call goes immediately
 * to voicemail.  If it does, then it is very unlikely that the call is spoofed.  If it is not answered 
 * immediately, then the call is likely spoofed.
 */

import { Call, CallEndedException, setup } from '../call.js';

const script = async function(inCall) {
    console.log('Inbound call', inCall.sid, 'caller id:', inCall.from);

    // Uncomment the following line to force the spoofing check
    // delete inCall.stirVerstat;

    // Check the SHAKEN/STIR attestation.  If it's Attestation A, carry on.
    if (inCall.stirVerstat == 'TN-Validation-Passed-A') {
        console.log('Inbound call was not spoofed. SH/ST status:', inCall.stirVerstat);
        inCall.say('Your call was not spoofed. Goodbye, and have a nice day.');
        await inCall.sendFinalResponse();

    // If no attestation, or Attestations B or C, then conduct the spoofing check.
    } else {
        console.log(`Checking inbound call. SH/ST status: ${inCall.stirVerstat ? inCall.stirVerstat : 'none'}`);

        let outCall;
        try {
            outCall = await Call.makeCall(
                inCall.from, 
                inCall.to, 
                {statusCallbackEvent: ['ringing', 'answered', 'completed']});

            // If the call is answered immediately, then most likely we went to voicemail. 
            // Set a timer (2 secs) for the 'ringing' (180/183 status) -> 'in-progress' (200 status) callbacks.
            if (outCall.status == 'ringing') {
                console.log('Outbound call: starting timer');

                // Cancel the call if the timer goes off
                const answerTimeout = setTimeout(() => {
                    console.log('Outbound call: answer timed out');
                    outCall.cancel();
                }, 2000);                                     
                
                await outCall.nextEvent();              // Next event should be 'in-progress' or 'canceled'
                if (outCall.status == 'in-progress') {  // Answered, so most likely voicemail
                    console.log('Outbound call: canceling timer');
                    clearTimeout(answerTimeout);
                    await outCall.nextEvent();          // Next event should be the webhook to get TwiML
                }
            }

            switch (outCall.status) {
                case 'in-progress':
                    console.log('Outbound call was answered immediately, so inbound was likely not spoofed');
                    outCall.sendFinalResponse();
                    inCall.say('Your call was not spoofed. Goodbye, and have a nice day.');
                    inCall.sendFinalResponse();
                    break;

                case 'busy':
                    console.log('Outbound call was busy, and so inbound was likely was not spoofed');
                    inCall.say('Your call was not spoofed. Goodbye, and have a nice day.');
                    inCall.sendFinalResponse();
                    break;

                case 'failed':
                    console.log('Outbound call failed. SIP status:', outCall.sipResponseCode);
                    inCall.say('You are using a fake caller id. Do not have a nice day. Goodbye.');
                    inCall.sendFinalResponse();
                    break;

                case 'canceled':
                    console.log('Outbound call was not immediately answered, and so inbound was likely spoofed');
                    inCall.say("You are spoofing someone else's caller id. Do not have a nice day. Goodbye.")
                    inCall.sendFinalResponse();
                    break;

                default:
                    console.error('Outbound call had unexpected status:', outCall.status);
                    inCall.sendFinalResponse();
                    break;
            }

        } catch (err) {
            console.error(err);
            inCall.sendFinalResponse();
        }
    }
}

setup({script})
    .then(() => console.log('Script is running'));