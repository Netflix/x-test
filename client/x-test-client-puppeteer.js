import puppeteer from 'puppeteer';
import { Parser } from 'tap-parser';
import { XTestClientCommon } from './x-test-client-common.js';

export class XTestPuppeteerClient {
  /**
   * Run tests with optional coverage collection.
   * @param {Object} options - Configuration options
   * @param {string} options.url - Test page URL
   * @param {boolean} options.coverage - Whether to collect coverage
   * @param {Object} options.launchOptions - Puppeteer launch options
   */
  static async run(options) {
    let url = options?.url ?? null;
    const coverage = options?.coverage ?? false;
    const launchOptions = options?.launchOptions ?? {};

    if (coverage) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('x-test-run-coverage', '');
      url = urlObj.href;
    }

    try {
      // Launch browser
      const browser = await puppeteer.launch({
        timeout: 10_000,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...launchOptions,
      });

      const page = await browser.newPage();

      // Start coverage collection if supported and requested
      if (coverage && page.coverage) {
        await page.coverage.startJSCoverage();
      }

      // Set up TAP parser for validation
      const parser = new Parser(results => {
        if (!results.ok) {
          process.exit(1);
        }
      });

      // Capture console output and parse as TAP
      page.on('console', message => {
        const text = message.text();
        console.log(text); // eslint-disable-line no-console
        parser.write(text + '\n');
      });

      // Navigate to test page
      await page.goto(url);

      // Wait for test readiness
      await page.evaluate(XTestClientCommon.run());

      // Handle coverage if collected
      if (coverage && page.coverage) {
        const js = await page.coverage.stopJSCoverage();
        await page.evaluate(XTestClientCommon.cover(), { js });
      }

      // Close parser
      parser.end();

      // Close browser
      await browser.close();
    } catch (error) {
      XTestClientCommon.bail(error);
    }
  }
}
