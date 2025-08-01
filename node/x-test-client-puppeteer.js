import puppeteer from 'puppeteer';
import { XTestClient } from './x-test-client.js';

export class XTestPuppeteerClient {
  /**
   * Run tests with optional coverage collection.
   * @param {Object} options - Configuration options
   * @param {string} options.url - Test page URL
   * @param {boolean} options.coverage - Whether to collect coverage
   * @param {Object} options.launchOptions - Puppeteer launch options
   */
  static async run(options) {
    const url = options?.url ?? null;
    const coverage = options?.coverage ?? false;
    const launchOptions = options?.launchOptions ?? {};

    XTestClient.validateObjectKeys('options', ['url', 'coverage', 'launchOptions'], options);
    XTestClient.validateType('url', String, url);
    XTestClient.validateType('coverage', Boolean, coverage);
    XTestClient.validateType('launchOptions', Object, launchOptions);

    try {
      // Launch browser
      const browser = await puppeteer.launch({
        timeout: 10000,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...launchOptions,
      });

      const page = await browser.newPage();

      // Start coverage collection if supported and requested
      if (coverage && page.coverage) {
        await page.coverage.startJSCoverage();
      }

      // Map browser console to stdout
      page.on('console', message => console.log(message.text())); // eslint-disable-line no-console

      // Navigate to test page
      const testUrl = coverage ? `${url}?x-test-run-coverage` : url;
      await page.goto(testUrl);

      // Wait for test readiness
      await page.evaluate(XTestClient.run());

      // Handle coverage if collected
      if (coverage && page.coverage) {
        const js = await page.coverage.stopJSCoverage();
        await page.evaluate(XTestClient.cover(), { js });
      }

      // Close browser
      await browser.close();
    } catch (error) {
      XTestClient.bail(error);
    }
  }
}
