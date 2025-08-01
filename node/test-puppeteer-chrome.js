import { XTestPuppeteerClient } from './x-test-client-puppeteer.js';

const url = 'http://127.0.0.1:8080/test/';
const coverage = true;
const launchOptions = { args: ['--no-sandbox', '--disable-setuid-sandbox'] };
await XTestPuppeteerClient.run({ url, coverage, launchOptions });
