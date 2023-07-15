/**
 * @module utils/phonenumbers
 * 
 * Module that provides a wrapper around libphonenumber-js to allow parsing of phone numbers using the 
 * local machine's locale as the default.
 * @see {@link https://gitlab.com/catamphetamine/libphonenumber form-js}
 */

import parsePhoneNumber from 'libphonenumber-js';

const locale = Intl.DateTimeFormat().resolvedOptions().locale;  // e.g. en-US
const localeCountry = locale.split('-')[1];

/**
 * Parses a phone number, possibly including spaces and punctuation, taking into account local dialing conventions.
 * @param {string} pn - The phone number to parse
 * @param {string} {countryCode} - Two-letter ISO 3166 country code; defaults to locale of local machine
 * @returns {string} - E.164 (international) format phone number, with no punctuation
 */
export function parsePN(pn, countryCode) {
    countryCode = countryCode ? countryCode.toUpperCase() : localeCountry;
    return parsePhoneNumber(pn, countryCode).number;
}

/**
 * Returns a phone number in national, friendly format.
 * @param {string} pn - The phone number in E.164 format
 * @returns {string} - The phone number in national format
 */
export function nationalPN(pn) {
    return parsePhoneNumber(pn).formatNational();
}