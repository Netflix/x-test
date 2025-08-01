import { chromium, firefox, webkit } from 'playwright';
import { XTestClient } from './x-test-client.js';

export class XTestPlaywrightClient {
  /**
   * Run tests.
   * @param {Object} options - Configuration options
   * @param {string} options.url - Test page URL
   * @param {string} options.browser - Playwright browser id (e.g., chromium, firefox, webkit)
   * @param {Object} options.launchOptions - Playwright launch options
   */
  static async run(options) {
    const url = options?.url ?? null;
    const browserId = options?.browser ?? null;
    const launchOptions = options?.launchOptions ?? {};

    XTestClient.validateObjectKeys('options', ['url', 'browser', 'coverage', 'launchOptions'], options);
    XTestClient.validateType('url', String, url);
    XTestClient.validateOneOf('browser', ['chromium', 'firefox', 'webkit'], browserId);
    XTestClient.validateType('launchOptions', Object, launchOptions);

    try {
      // Launch browser - let Playwright handle invalid browser errors
      const browser = { chromium, firefox, webkit }[browserId];
      const browserInstance = await browser.launch({
        headless: true,
        ...launchOptions,
      });

      const context = await browserInstance.newContext();
      const page = await context.newPage();

      // Map browser console to stdout
      page.on('console', message => console.log(message.text())); // eslint-disable-line no-console

      // Navigate to test page
      await page.goto(url);

      // Wait for test readiness
      await page.evaluate(XTestClient.run());

      // Close browser
      await browserInstance.close();
    } catch (error) {
      XTestClient.bail(error);
    }
  }
}
