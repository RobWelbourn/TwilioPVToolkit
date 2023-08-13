import { Timeout, TimeoutException } from '../timeout.js';

describe('Timeout class', () => {
    test('wait() fulfills', async () => {
        const result = await new Timeout(100).wait();
        expect(result).toBeUndefined();
    });

    test('wait() rejects', async () => {
        try {
            const result = await new Timeout(100, 'Rejects').wait();
        } catch (err) {
            expect(err instanceof TimeoutException).toBe(true);
            expect(err.message).toBe('Rejects');
        }
    });

    test('apply() does not time out', async () => {
        const t1 = new Timeout(50);
        let result = await new Timeout(100, 'Should not time out').apply(t1.wait());
        expect(result).toBeUndefined();

        const p1 = new Promise((resolve, reject) => resolve('42'));
        result = await new Timeout(50, 'Should not time out').apply(p1);
        expect(result).toBe('42');

        const p2 = new Promise((resolve, reject) => reject(new Error('Error 42')));
        try {
            result = await new Timeout(50, 'Should not time out').apply(p2);
        } catch (err) {
            expect(err instanceof TimeoutException).toBe(false);
            expect(err.message).toBe('Error 42');
        }
    });

    test('apply() does time out', async () => {
        const t1 = new Timeout(100);
        try {
            let result = await new Timeout(50, 'Should time out').apply(t1.wait());
        } catch (err) {
            expect(err instanceof TimeoutException).toBe(true);
            expect(err.message).toBe('Should time out');
        }
    });
})