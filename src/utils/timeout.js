/**
 * @module timeout
 * 
 * @description Provides classes for applying timeouts to async operations.
 * 
 * @example
 * await new Timeout(2000).wait();  // wait 2000 milliseconds
 * // then do something
 * 
 * @example
 * try {
 *     response = await new Timeout(2000, "Fetch timed out").apply(fetch(url));
 *     // process fetch results
 * } catch (err) {
 *     if (err instanceof TimeoutException) console.log(err.message);
 *     else throw err;
 * }
 */

/**
 * @classdesc
 * Helper class used to distinguish timeouts from other kinds of error.
 */
export class TimeoutException extends Error {}

/**
 * @classdesc
 * Simple class that wraps a Promise around a timer, so that the timer can be awaited.
 */
export class Timeout {
    #promise;
    #timerId;

    /**
     * Constructor.
     * @param {int} delay - Delay in milliseconds
     * @param {string} reason - Message passed to TimeoutException; the Promise will be rejected, if set. 
     *                          If omitted, the Promise will be fulfilled.
     */
    constructor(delay, reason) {
        this.#promise = new Promise((fulfill, reject) => {       
            this.#timerId = setTimeout(() => {
                if (reason === undefined) fulfill();
                else reject(new TimeoutException(reason));
            }, delay);
        });
    }

    /**
     * Applies the timeout to some operation that will be completed when its Promise is fulfilled.  
     * If the operation times out, the Timeout will reject with a TimeoutException.
     * @param {Promise} promise - The timeout will be applied to this Promise
     * @returns {Promise} - Either the timeout, upon rejection, or the input Promise, upon fulfillment.
     */
    apply(promise) {
        return Promise.race([
            this.#promise, 
            promise.then(       // Make sure we clear the timeout
                result => {
                    clearTimeout(this.#timerId);
                    return result;
                },
                err => {
                    clearTimeout(this.#timerId);
                    return Promise.reject(err);     // "Re-throw" the exception
                }
            )
        ]);
    }

    /**
     * Waits for the Timeout.
     * @returns {Promise} that fulfills (or rejects) when the Timeout expires.
     */
    wait() {
        return this.#promise;
    }
}