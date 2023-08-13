import 'dotenv/config';  // Needed to get environment vars from .env file
import { setup, shutDown, Call } from '../call.js'
import { getClient } from '../utils/client.js';

let client;
let from;
let to;
let busyNum;
let rejectNum;
let helloGoodbyeUrl;

beforeAll(() => {
    to = process.env.PN_ANSWER;
    from = process.env.PN_FROM;
    busyNum = process.env.PN_BUSY;
    rejectNum = process.env.PN_REJECT;
    helloGoodbyeUrl = process.env.URL_HELLO_GOODBYE;
    client = getClient(process.env.TEST_ACCOUNT_SID, process.env.TEST_API_KEY, process.env.TEST_API_SECRET);
    return setup({ client });
});

afterAll((done) => {
    shutDown(done);
});

describe('Call.makeCall() errors', () => {
    test('Call.makeCall() options errors', () => {
        expect(() => Call.makeCall(to, from, { url: 'https://someUrl' })).toThrow(TypeError);
        expect(() => Call.makeCall(to, from, { fallbackUrl: 'https://someUrl' })).toThrow(TypeError);
        expect(() => Call.makeCall(to, from, { statusCallback: 'https://someUrl' })).toThrow(TypeError);
        expect(() => Call.makeCall(to, from, { recordingStatusCallback: 'https://someUrl' })).toThrow(TypeError);
        expect(() => Call.makeCall(to, from, { amdStatusCallback: 'https://someUrl' })).toThrow(TypeError);
        expect(() => Call.makeCall(to, from, { applicationSid: 'APxxxx' })).toThrow(TypeError);
    });

    test('Call.makeCall() to and from errors', async () => {
        await expect(Call.makeCall(undefined, from)).rejects.toThrow(Error);
        await expect(Call.makeCall(to, undefined)).rejects.toThrow(Error);
    });
});