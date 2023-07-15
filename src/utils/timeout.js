/**
 * @module timeout
 * 
 * Provides classes for applying timeouts to async operations.  Example usage:
 * 
 * await new Timeout(2000).wait();  // wait 2000 milliseconds
 * // then do something
 * 
 * try {
 *     response = await new Timeout(2000, "Fetch timed out").apply(fetch(url));
 *     // process fetch results
 * } catch (err) {
 *     if (err instanceof TimeoutException) console.log(err.message);
 *     else throw err;
 * }
 * 
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
     *                          If omitted, the Promise will be resolved.
     */
    constructor(delay, reason) {
        this.#promise = new Promise((resolve, reject) => {       
            this.#timerId = setTimeout(() => {
                if (reason === undefined) resolve();
                else reject(new TimeoutException(reason));
            }, delay);
        });
    }

    /**
     * Applies the timeout to some operation that will be completed when its Promise is resolved.  
     * If the operation times out, the Timeout will (usually) reject with a TimeoutException.
     * @param {Promise} promise - The timeout will be applied to this Promise
     * @returns {Promise} - Either the timeout, usually rejected, or the input Promise, usually resolved 
     */
    apply(promise) {
        return Promise.race([
            this.#promise, 
            promise.then(       // Make sure we clear the timeout if the operation completes in time
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
     * @returns {Promise} that resolves (or rejcts) when the Timeout expires.
     */
    wait() {
        return this.#promise;
    }
}