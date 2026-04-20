export class XTestCommon {
    static TIMEOUT: symbol;
    static IFRAME_ERROR: symbol;
    static IFRAME_LOAD: symbol;
    /**
     * @param {number} interval - The timeout duration in milliseconds.
     * @returns {Promise<symbol>} Resolves to XTestCommon.TIMEOUT after interval.
     */
    static timeout(interval: number): Promise<symbol>;
    /**
     * @param {EventTarget} iframe - The iframe element we are booting.
     * @returns {Promise<symbol>} Resolves with XTestCommon.IFRAME_ERROR when
     *   the iframe fires an error event (network-level failures).
     */
    static iframeError(iframe: EventTarget): Promise<symbol>;
    /**
     * @param {EventTarget} iframe - The iframe element we are booting.
     * @returns {Promise<symbol>} Resolves with XTestCommon.IFRAME_LOAD when
     *   the iframe fires a load event.
     */
    static iframeLoad(iframe: EventTarget): Promise<symbol>;
    /**
    * Promise that resolves at DOMContentLoaded.
    * @param {Document} doc - Takes a parameter so tests can swap in a mock.
    * @returns {Promise<void>}
    */
    static domContentLoadedPromise(doc: Document): Promise<void>;
}
