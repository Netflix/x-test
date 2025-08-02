import puppeteer from 'puppeteer';
import { Parser } from 'tap-parser';
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
    let url = options?.url ?? null;
    const coverage = options?.coverage ?? false;
    const launchOptions = options?.launchOptions ?? {};

    XTestClient.validateObjectKeys('options', ['url', 'coverage', 'launchOptions'], options);
    XTestClient.validateType('url', String, url);
    XTestClient.validateType('coverage', Boolean, coverage);
    XTestClient.validateType('launchOptions', Object, launchOptions);

    // Parse command line arguments for test name filtering
    const args = process.argv.slice(2);
    const testNameArg = args.find(arg => arg.startsWith('--testName='));
    if (testNameArg) {
      const testName = testNameArg.split('=')[1];
      const urlObj = new URL(url);
      urlObj.searchParams.set('x-test-name', testName);
      url = urlObj.href;
    }
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

      // Parse command line arguments for tap-parser options
      const cliArgs = process.argv.slice(2);
      const useTapParser = !cliArgs.includes('--no-validate');
      let parser = null;

      if (useTapParser) {
        // Set up TAP parser for validation
        parser = new Parser(results => {
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
      } else {
        // Map browser console directly to stdout
        page.on('console', message => console.log(message.text())); // eslint-disable-line no-console
      }

      // Navigate to test page
      await page.goto(url);

      // Wait for test readiness
      await page.evaluate(XTestClient.run());

      // Handle coverage if collected
      if (coverage && page.coverage) {
        const js = await page.coverage.stopJSCoverage();
        await page.evaluate(XTestClient.cover(), { js });
      }

      // Close parser if used
      if (parser) {
        parser.end();
      }

      // Close browser
      await browser.close();
    } catch (error) {
      XTestClient.bail(error);
    }
  }
}
