#!/usr/bin/env node

import { XTestPuppeteerClient } from './x-test-client-puppeteer.js';

// Define allowed arguments
const ALLOWED_ARGS = ['client', 'url',  'coverage', 'test-name'];
const ALLOWED_ARGS_DEBUG = ALLOWED_ARGS.map(arg => `"--${arg}"`).join(', ');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=', 2);

    // Check if argument is allowed
    if (!ALLOWED_ARGS.includes(key)) {
      const primaryMessage = `Error: Unknown argument "--${key}".`;
      const secondaryMessage = `Allowed arguments: ${ALLOWED_ARGS_DEBUG}.`;
      const message = [primaryMessage, secondaryMessage].join('\n');
      console.error(new Error(message)); // eslint-disable-line no-console
      process.exit(1);
    }

    // Check if value is provided
    if (value === undefined) {
      const message = `Error: Argument "--${key}" requires a value (e.g., "--${key}=<value>").`;
      console.error(new Error(message)); // eslint-disable-line no-console
      process.exit(1);
    }

    // Map kebab-case to camelCase for internal use
    const camelKey = key === 'test-name' ? 'testName' : key;
    options[camelKey] = value;
  } else {
    const message = `Error: Invalid argument "${arg}". All arguments must start with "--".`;
    console.error(new Error(message)); // eslint-disable-line no-console
    process.exit(1);
  }
}

// Validate required arguments
if (!options.client) {
  const message = 'Error: "--client" is required (e.g., "--client=puppeteer").';
  console.error(new Error(message)); // eslint-disable-line no-console
  process.exit(1);
}

if (!options.url) {
  const message = 'Error: "--url" is required (e.g., "--url=http://localhost:8080/test/").';
  console.error(new Error(message)); // eslint-disable-line no-console
  process.exit(1);
}

// Validate client type
if (options.client !== 'puppeteer') {
  const message = `Error: Unsupported client "${options.client}". Supported clients: "puppeteer".`;
  console.error(new Error(message)); // eslint-disable-line no-console
  process.exit(1);
}

// Convert coverage string to boolean
let coverage = false;
if (options.coverage) {
  if (options.coverage === 'true') {
    coverage = true;
  } else if (options.coverage === 'false') {
    coverage = false;
  } else {
    const message = `Error: --coverage must be "true" or "false", got "${options.coverage}".`;
    console.error(new Error(message)); // eslint-disable-line no-console
    process.exit(1);
  }
}

// Build client options
const clientOptions = {
  url: options.url,
  coverage,
  launchOptions: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
};

// Handle testName filtering by adding to URL
if (options.testName) {
  const urlObj = new URL(clientOptions.url);
  urlObj.searchParams.set('x-test-name', options.testName);
  clientOptions.url = urlObj.href;
}

// Run the appropriate client
switch (options.client) {
  case 'puppeteer':
    await XTestPuppeteerClient.run(clientOptions);
    break;
  default: {
    const message = `Error: Unsupported client "${options.client}".`;
    console.error(new Error(message)); // eslint-disable-line no-console
    process.exit(1);
  }
}
