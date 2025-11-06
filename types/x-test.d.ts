export function assert(ok: unknown, text?: string): void;
export function coverage(href: string, goal: number): void;
export function waitFor(promise: Promise<unknown>): Promise<void>;
export function test(href: string): void;
export function describe(text: string, callback: () => void): void;
export namespace describe {
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
export function it(text: string, callback: () => void | Promise<void>, interval?: number): void;
export namespace it {
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
