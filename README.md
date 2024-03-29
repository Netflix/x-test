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

**See `test.js` for an example of how to capture coverage information in
puppeteer and send it to your test to allow your automated test to fail due to
unmet coverage goals.

## Execution

Both `test` and `it` calls will execute _in order_**. `test` calls will boot the
given html page in an iframe. Such iframes are run one-at-a-time. All invoked
`it` calls await the completion of previously-invoked `it` calls.

**This is not the case if you nest `it`--but that's an anti-pattern anyhow.

## Usage with `puppeteer`

See `test.js` for an example of how you can use `puppeteer` to run your app's
tests and log the resulting TAP output to the console.

## Parsing TAP

There are many TAP formatters. Importantly, as long as you can pipe the TAP
output to another program, the output should be interoperable.
