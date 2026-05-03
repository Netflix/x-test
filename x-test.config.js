export default {
  url: 'http://127.0.0.1:8080/test/',
  client: 'puppeteer',
  browser: 'chromium',
  coverage: true,
  coverageGoals: {
    './x-test-common.js':        { lines: 100 },
    './x-test-frame.js':         { lines: 100 },
    './x-test-reporter.js':      { lines: 100 },
    './x-test-reporter.css.js':  { lines: 100 },
    './x-test-root.js':          { lines: 100 },
    './x-test-tap.js':           { lines: 100 },
    './x-test.js':               { lines: 100 },
  },
};
