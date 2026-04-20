export class XTestCommon {
  static TIMEOUT = Symbol('timeout');
  static IFRAME_ERROR = Symbol('iframeError');
  static IFRAME_LOAD = Symbol('iframeLoad');

  /**
   * @param {number} interval - The timeout duration in milliseconds.
   * @returns {Promise<symbol>} Resolves to XTestCommon.TIMEOUT after interval.
   */
  static async timeout(interval) {
    return await new Promise(resolve => {
      setTimeout(() => { resolve(XTestCommon.TIMEOUT); }, interval);
    });
  }

  /**
   * @param {EventTarget} iframe - The iframe element we are booting.
   * @returns {Promise<symbol>} Resolves with XTestCommon.IFRAME_ERROR when
   *   the iframe fires an error event (network-level failures).
   */
  static async iframeError(iframe) {
    return await new Promise(resolve => {
      iframe.addEventListener('error', () => { resolve(XTestCommon.IFRAME_ERROR); });
    });
  }

  /**
   * @param {EventTarget} iframe - The iframe element we are booting.
   * @returns {Promise<symbol>} Resolves with XTestCommon.IFRAME_LOAD when
   *   the iframe fires a load event.
   */
  static async iframeLoad(iframe) {
    return await new Promise(resolve => {
      iframe.addEventListener('load', () => { resolve(XTestCommon.IFRAME_LOAD); });
    });
  }

   /**
   * Promise that resolves at DOMContentLoaded.
   * @param {Document} doc - Takes a parameter so tests can swap in a mock.
   * @returns {Promise<void>}
   */
  static domContentLoadedPromise(doc) {
    return new Promise(resolve => {
      if (doc.readyState === 'complete') {
        resolve(undefined);
      } else {
        doc.addEventListener('DOMContentLoaded', () => resolve(undefined), { once: true });
      }
    });
  }
}
