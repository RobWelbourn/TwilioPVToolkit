import { makeTwiml, _makeTwiml } from '../twiml.js';

describe('TwiML tests', () => {
    test('Empty Response', () => {
        let twiml = makeTwiml();
        expect(twiml.toString()).toMatch(/<Response\/>/);
    });

    test('Say', () => {
        let twiml = makeTwiml();
        twiml.say({ language: 'en-US', voice: 'Polly.Amy' }, 'Hello');
        expect(twiml.toString()).toMatch(/<Say language="en-US" voice="Polly.Amy">Hello<\/Say>/);
    });
    
    test('Play', () => {
        let twiml = makeTwiml();
        twiml.play({ loop: 2 }, 'https://someUrl/foo.wav');
        expect(twiml.toString()).toMatch(/<Play loop="2">https:\/\/someUrl\/foo.wav<\/Play>/);
    });
    
    test('Pause', () => {
        let twiml = makeTwiml();
        twiml.pause({ length: 10 });
        expect(twiml.toString()).toMatch((/<Pause length="10"\/>/));
    });
    
    test('Hangup', () => {
        let twiml = makeTwiml();
        twiml.hangup();
        expect(twiml.toString()).toMatch(/<Hangup\/>/);
    })
    
    test('Reject', () => {
        let twiml = makeTwiml();
        twiml.reject({ reason: 'busy' });
        expect(twiml.toString()).toMatch(/<Reject reason="busy"\/>/);
    })

    test('Gather ok', () => {
        let twiml = makeTwiml();
        let gather = twiml.gather();
        expect(twiml.toString()).toMatch(/<Gather action="\/webhook/);

        gather.say('Boo!');
        gather.play({ loop: 2 }, 'https://someUrl/foo.wav');
        expect(twiml.toString()).toMatch(/<Say>Boo!<\/Say>/);
        expect(twiml.toString()).toMatch(/<Play loop="2">https:\/\/someUrl.foo.wav<\/Play>/)
    });

    test('Gather errors', () => {
        let twiml = makeTwiml();
        expect(() => twiml.gather({ action: 'https://someUrl' })).toThrow(TypeError);
        expect(() => twiml.gather({ 
                partialResultsCallback: 'https://someUrl', 
                partialResultsCallbackMethod: 'POST' }))
            .toThrow(TypeError);
        expect(() => twiml.gather({ actionOnEmptyResult: true })).toThrow(TypeError);
    });

    test('Dial ok', () => {
        let twiml = makeTwiml();
        let dial = twiml.dial();
        expect(twiml.toString()).toMatch(/<Dial action="\/dial"\/>/);

        twiml = makeTwiml();
        dial = twiml.dial("1234");
        expect(twiml.toString()).toMatch(/<Dial action="\/dial">1234<\/Dial>/);
    });
    
    test('Dial errors', () => {
        let twiml = makeTwiml();
        expect(() => twiml.dial({ action: 'https://someUrl' })).toThrow(TypeError);
        expect(() => twiml.dial({
                recordingStatusCallback: 'https://someUrl',
                recordingStatusCallbackMethod: 'POST',
                recordingStatusCallbackEvent: 'completed' }))
            .toThrow(TypeError);
        expect(() => twiml.dial({
                referUrl: 'https://someUrl',
                referMethod: 'POST' }))
            .toThrow(TypeError);
    });

    test('Dial Number ok', () => {
        let twiml = makeTwiml();
        let dial = twiml.dial();
        dial.number("1234");
        expect(twiml.toString()).toMatch(/<Dial action="\/dial"><Number>1234<\/Number><\/Dial>/);
    });

    test('Dial Number error', () => {
        let twiml = makeTwiml();
        expect(() => twiml.dial.number({
                statusCallBack: 'https://someUrl',
                statusCallBackMethod: 'POST' }))
            .toThrow(TypeError);
    });

    test('Dial Sip ok', () => {
        let twiml = makeTwiml();
        let dial = twiml.dial();
        dial.sip("sip:1234@foo.bar");
        expect(twiml.toString()).toMatch(/<Dial action="\/dial"><Sip>sip:1234@foo.bar<\/Sip><\/Dial>/);
    });

    test('Dial Sip error', () => {
        let twiml = makeTwiml();
        expect(() => twiml.dial.sip({ url: 'https://someUrl' })).toThrow(TypeError);
    });

    test('Dial Client ok', () => {
        let twiml = makeTwiml();
        let dial = twiml.dial();
        dial.client("client:1234");
        expect(twiml.toString()).toMatch(/<Dial action="\/dial"><Client>client:1234<\/Client><\/Dial>/);
    });

    test('Dial Conference ok', () => {
        let twiml = makeTwiml();
        let dial = twiml.dial();
        dial.conference("myconf");
        expect(twiml.toString()).toMatch(/<Dial action="\/dial"><Conference>myconf<\/Conference><\/Dial>/);
    });

    test('Dial Conference error', () => {
        let twiml = makeTwiml();
        expect(() => twiml.dial.conference({ waitUrl: 'https://someUrl' })).toThrow(TypeError);
    });

    test('Dial Queue ok', () => {
        let twiml = makeTwiml();
        let dial = twiml.dial();
        dial.queue("myqueue");
        expect(twiml.toString()).toMatch(/<Dial action="\/dial"><Queue>myqueue<\/Queue><\/Dial>/);
    });

    test('Dial Queue error', () => {
        let twiml = makeTwiml();
        expect(() => twiml.dial.queue({ url: 'https://someUrl' })).toThrow(TypeError);
    });

    test('Unimplemented verbs', () => {
        const twiml = makeTwiml();
        expect(() => twiml.connect()).toThrow(TypeError);
        expect(() => twiml.echo()).toThrow(TypeError);
        expect(() => twiml.enqueue()).toThrow(TypeError);
        expect(() => twiml.leave()).toThrow(TypeError);
        expect(() => twiml.pay()).toThrow(TypeError);
        expect(() => twiml.record()).toThrow(TypeError);
        expect(() => twiml.redirect()).toThrow(TypeError);
        expect(() => twiml.refer()).toThrow(TypeError);
        expect(() => twiml.siprec()).toThrow(TypeError);
        expect(() => twiml.sms()).toThrow(TypeError);
        expect(() => twiml.stream()).toThrow(TypeError);
    });

    test('Redirect (internal only)', () => {
        const twiml = _makeTwiml();
        twiml.redirect('/foo');
        expect(twiml.toString()).toMatch(/<Redirect>\/foo<\/Redirect>/);
    })
});