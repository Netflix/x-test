export class XTestCommon {
  static TIMEOUT = Symbol('timeout');

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
