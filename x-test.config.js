export default {
  url: 'http://127.0.0.1:8080/test/',
  client: 'puppeteer',
  browser: 'chromium',
  coverage: true,
  coverageTargets: {
    './x-test.js':          { lines: 100 },
    './x-test-tap.js':      { lines: 100 },
    './x-test-suite.js':    { lines: 95 },
    './x-test-root.js':     { lines: 78 },
    './x-test-reporter.js': { lines: 70 },
  },
};
