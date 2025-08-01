import { XTestPlaywrightClient } from './x-test-client-playwright.js';

const url = 'http://127.0.0.1:8080/test/';
const browser = 'chromium';
const launchOptions = {  args: ['--no-sandbox', '--disable-setuid-sandbox'] };
await XTestPlaywrightClient.run({ url, browser, launchOptions });
