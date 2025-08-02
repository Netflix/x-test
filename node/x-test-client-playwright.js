import { chromium, firefox, webkit } from 'playwright';
import { Parser } from 'tap-parser';
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
    let url = options?.url ?? null;
    const browserId = options?.browser ?? null;
    const launchOptions = options?.launchOptions ?? {};

    XTestClient.validateObjectKeys('options', ['url', 'browser', 'coverage', 'launchOptions'], options);
    XTestClient.validateType('url', String, url);
    XTestClient.validateOneOf('browser', ['chromium', 'firefox', 'webkit'], browserId);
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

    try {
      // Launch browser - let Playwright handle invalid browser errors
      const browser = { chromium, firefox, webkit }[browserId];
      const browserInstance = await browser.launch({
        headless: true,
        ...launchOptions,
      });

      const context = await browserInstance.newContext();
      const page = await context.newPage();

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

      // Close parser if used
      if (parser) {
        parser.end();
      }

      // Close browser
      await browserInstance.close();
    } catch (error) {
      XTestClient.bail(error);
    }
  }
}
