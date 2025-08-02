# x-test

a simple, tap-compliant test runner for the browser

## Spec

- importable as `type="module"`
- is interoperable with TAP Version 14
- nested sub-tests run in an iframe
- has a recognizable testing interface (`it`, `describe`, `assert`)
- can be used for automated testing
- can be used to assert coverage goals

## Interface

### Testing

The following are exposed in the testing interface:

- `test`: Creates a sub-test in an `iframe` based on given `src` html page.
- `it`: The smallest testing unit — can be asynchronous.
- `it.skip`: An `it` whose callback is not run and which will pass.
- `it.only`: Skip all other `it` tests.
- `it.todo`: An `it` whose callback _is_ run and is expected to fail.
- `describe`: Simple grouping functionality.
- `describe.skip`: Skip all `it` tests in this group.
- `describe.only`: Skip all other `describe` groups and `it` tests.
- `describe.todo`: Mark all `it` tests within this group as _todo_.
- `waitFor`: Ensures test registration remains open until given promise settles.
- `assert`: Simple assertion call that throws if the boolean input is false-y.
- `coverage`: Sets a coverage goal for the given href.

### Events

Messages are posted to a `BroadcastChannel` channel with the name `x-test`.

- `x-test-client-ping`: root responds (`x-test-root-pong`, { status: 'started'|'ended' waiting: true|false })
- `x-test-root-pong`: response to `x-test-client-ping`
- `x-test-root-coverage-request`: client should respond (`x-test-coverage-result`)
- `x-test-client-coverage-result`: response to `x-test-root-coverage-request`
- `x-test-root-end`: all tests have completed or we bailed out
- (internal) `x-test-root-run`: all tests have completed or we bailed out
- (internal) `x-test-suite-coverage`: signal to test for coverage on a particular file
- (internal) `x-test-suite-register`: registers a new test / describe / it
- (internal) `x-test-suite-ready`: signal that test suite is done with registration
- (internal) `x-test-suite-result`: marks end of "it" test
- (internal) `x-test-suite-bail`: signal to quit test early

### Parameters

The following parameters can be passed in via query params on the url:

- `x-test-no-reporter`: turns off custom reporting tool ui
- `x-test-run-coverage`: turns on coverage reporting**
- `x-test-name`: filters tests by name using regex pattern matching**

**See `test.js` for an example of how to capture coverage information in
puppeteer and send it to your test to allow your automated test to fail due to
unmet coverage goals. The `x-test-name` parameter filters tests by matching the full test name (including parent describe blocks) against the provided regex pattern.

## Execution

Both `test` and `it` calls will execute _in order_**. `test` calls will boot the
given html page in an iframe. Such iframes are run one-at-a-time. All invoked
`it` calls await the completion of previously-invoked `it` calls.

**This is not the case if you nest `it`--but that's an anti-pattern anyhow.

## Test Filtering

You can filter tests by name using the `x-test-name` query parameter, which accepts a regex pattern. This allows you to run only specific tests that match the pattern.

### Browser Usage
```
http://localhost:8080/test/?x-test-name=should%20validate
```

### Command Line Usage
When using the Puppeteer or Playwright clients, you can use the `--testName` argument:

```bash
node node/test-puppeteer-chrome.js --testName="should validate"
node node/test-playwright-chromium.js --testName="user.*login"
```

The pattern will match against the full test name, including any parent `describe` block names joined with spaces.

## Usage with `puppeteer` or `playwright`

See `node/x-test-client-puppeteer.js` for an example of how you can use
`puppeteer` to run your app's tests and log the resulting TAP output.

See `node/x-test-client-playwright.js` for an example of how you can use
`playwright` to run your app's tests and log the resulting TAP output.

## Parsing TAP

There are many TAP formatters. Importantly, as long as you can pipe the TAP
output to another program, the output should be interoperable.
