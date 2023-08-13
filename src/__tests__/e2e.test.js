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

describe.skip('Simple outbound e2e tests', () => {
    test('Make outbound call', async () => {
        const call = await Call.makeCall(to, from);
        expect(call.status).toBe('in-progress');
        expect(call.eventSource).toBe('webhook');
        expect(call.sid).toBeTruthy();
        call.hangup();
        await call.sendResponse();
        expect(call.status).toBe('completed');
        expect(call.eventSource).toBe('status');
    });
});