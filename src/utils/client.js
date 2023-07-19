/**
 * @module client
 * 
 * @description The client module provides support for creating a Twilio API client.  The getClient() function will accept 
 * an account SID and API key+secret, or else it will look for the standard environment variables TWILIO_ACCOUNT_SID, 
 * TWILIO_API_KEY and TWILIO_API_SECRET, first in the operating system environment, and then in the Node.js .env file.
 */

import 'dotenv/config';
import Twilio from 'twilio';

/**
 * Function which creates a Twilio client object from a set of account credentials.
 * @param {string} [accountSid=process.env.TWILIO_API_SECRET] - Account SID
 * @param {string} [apiKey=process.env.TWILIO_API_KEY] - API key
 * @param {string} [apiSecret=process.env.TWILIO_API_SECRET] - API secret
 * @returns {Object} - Client object
 */
export function getClient(accountSid=process.env.TWILIO_ACCOUNT_SID, 
                   apiKey=process.env.TWILIO_API_KEY, 
                   apiSecret=process.env.TWILIO_API_SECRET) 
{
    return new Twilio(apiKey, apiSecret, { accountSid });
}