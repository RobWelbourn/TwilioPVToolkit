import { parsePN, nationalPN } from "../phonenumbers";

describe('Phone numbers', () => {
    test('parsePN() good examples', () => {
        expect(parsePN('617-555-1234', 'us')).toBe('+16175551234');
        expect(parsePN('(617) 555-1234', 'us')).toBe('+16175551234');
        expect(parsePN('(01274) 612087', 'GB')).toBe('+441274612087');
    });

    test('parsePN() bad country code', () => {
        expect(() => parsePN('(01274) 612087', 'uk')).toThrow(TypeError);
    });

    test('parsePN() invalid phone number', () => {
        expect(() => parsePN('foo')).toThrow(TypeError);
    });

    test('nationaPN() good examples', () => {
        expect(nationalPN('+16175551234')).toBe('(617) 555-1234');
        expect(nationalPN('+441274612087')).toBe('01274 612087');
    });

    test('nationaPN() invalid phone number', () => {
        expect(() => nationalPN('foo')).toThrow(TypeError);
    });
})