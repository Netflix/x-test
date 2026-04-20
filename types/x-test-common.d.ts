export class XTestCommon {
    static TIMEOUT: symbol;
    /**
     * @param {number} interval - The timeout duration in milliseconds.
     * @returns {Promise<symbol>} Resolves to XTestCommon.TIMEOUT after interval.
     */
    static timeout(interval: number): Promise<symbol>;
    /**
     * Promise that resolves at DOMContentLoaded.
     * @param {Document} doc - Takes a parameter so tests can swap in a mock.
     * @returns {Promise<void>}
     */
    static domContentLoadedPromise(doc: Document): Promise<void>;
}
