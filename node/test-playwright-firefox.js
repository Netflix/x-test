import { XTestPlaywrightClient } from './x-test-client-playwright.js';

const url = 'http://127.0.0.1:8080/test/';
const browser = 'firefox';
await XTestPlaywrightClient.run({ url, browser });
