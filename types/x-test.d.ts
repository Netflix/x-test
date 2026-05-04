/**
 * Simple assertion which throws exception when value is not truthy.
 * @example
 *   assert('foo' === 'bar', 'foo does not equal bar');
 * @param {unknown} value - The condition to assert (truthy/falsy)
 * @param {string} [message] - The assertion message
 * @returns {asserts value} Throws if condition is falsy or arguments are invalid.
 */
export function assert(value: unknown, message?: string, ...args: any[]): asserts value;
export namespace assert {
    /**
     * Strict deep-equality assertion. Supports primitives, plain objects, and
     * arrays. Throws (not an assertion failure) for unsupported types like Map,
     * Set, Date, and other classes.
     * @example
     *   assert.deepEqual({ a: 1 }, { a: 1 });
     * @template T
     * @param {unknown} actual - The actual value
     * @param {T} expected - The expected value
     * @param {string} [message] - The assertion message
     * @returns {asserts actual is T} Throws if values are not deeply equal or arguments are invalid.
     */
    function deepEqual<T>(actual: unknown, expected: T, message?: string, ...args: any[]): asserts actual is T;
    /**
     * Asserts that a function throws, testing the thrown value against a RegExp via `String(thrown)`.
     * @example
     *   assert.throws(() => { throw new Error('boom'); }, /^Error: boom$/);
     *   assert.throws(() => { throw new Error('boom'); }, new RegExp('.*')); // match anything — just assert it throws
     * @param {() => void} fn - The function expected to throw
     * @param {RegExp} error - Tested against `String(thrown)`
     * @param {string} [message] - The assertion message
     * @returns {void} Throws if the function does not throw, the thrown value does not match, or arguments are invalid.
     */
    function throws(fn: () => void, error: RegExp, message?: string, ...args: any[]): void;
    /**
     * Asserts that an async function rejects, testing the rejection against a RegExp via `String(thrown)`.
     * @example
     *   await assert.rejects(async () => { throw new Error('boom'); }, /^Error: boom$/);
     *   await assert.rejects(() => Promise.reject(new Error('boom')), new RegExp('.*')); // match anything — just assert it rejects
     * @param {() => Promise<unknown>} fn - The function expected to reject
     * @param {RegExp} error - Tested against `String(thrown)`
     * @param {string} [message] - The assertion message
     * @returns {Promise<void>} Rejects if the function does not reject, the rejection value does not match, or arguments are invalid.
     */
    function rejects(fn: () => Promise<unknown>, error: RegExp, message?: string, ...args: any[]): Promise<void>;
}
export function load(href: string): void;
export function suite(text: string, callback: () => void): void;
export namespace suite {
    /**
     * Register a test group that will be skipped during execution.
     * @param {string} text - The description of the test group
     * @param {() => void} callback - The callback function containing nested tests
     * @returns {void}
     */
    function skip(text: string, callback: () => void): void;
    /**
     * Register a test group that will run exclusively (skips other non-only tests).
     * @param {string} text - The description of the test group
     * @param {() => void} callback - The callback function containing nested tests
     * @returns {void}
     */
    function only(text: string, callback: () => void): void;
    /**
     * Register a placeholder test group for future implementation.
     * @param {string} text - The description of the test group
     * @param {() => void} callback - The callback function containing nested tests
     * @returns {void}
     */
    function todo(text: string, callback: () => void): void;
}
export function test(text: string, callback: () => void | Promise<void>, interval?: number): void;
export namespace test {
    /**
     * Register a test case that will be skipped during execution.
     * @param {string} text - The description of the test case
     * @param {() => void | Promise<void>} callback - The test callback function
     * @param {number} [interval] - Optional timeout in milliseconds
     * @returns {void}
     */
    function skip(text: string, callback: () => void | Promise<void>, interval?: number): void;
    /**
     * Register a test case that will run exclusively (skips other non-only tests).
     * @param {string} text - The description of the test case
     * @param {() => void | Promise<void>} callback - The test callback function
     * @param {number} [interval] - Optional timeout in milliseconds
     * @returns {void}
     */
    function only(text: string, callback: () => void | Promise<void>, interval?: number): void;
    /**
     * Register a placeholder test case for future implementation.
     * @param {string} text - The description of the test case
     * @param {() => void | Promise<void>} callback - The test callback function
     * @param {number} [interval] - Optional timeout in milliseconds
     * @returns {void}
     */
    function todo(text: string, callback: () => void | Promise<void>, interval?: number): void;
}
