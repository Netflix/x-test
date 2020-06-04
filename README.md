[![Build Status](https://travis-ci.com/Netflix/x-test.svg?token=3yeDbz9qTUyNsEsN48Ap&branch=master)](https://travis-ci.com/Netflix/x-test)

# x-test

a simple, tap-compliant test runner for the browser

## Spec

- importable as `type="module"`
- is interoperable with TAP Version 13
- nested sub-tests run in an iframe
- has a recognizable testing interface
- can be used for automated testing
- can be used to assert coverage goals

## Interface

### Testing

The following are exposed in the testing interface:

- `test`: Creates a sub-test in an `iframe` based on given `src` html page.
- `it`: The smallest testing unit--asynchronous.
- `skip`: An `it` whose callback is not run and which will pass.
- `todo`: An `it` whose callback _is_ run and is expected to fail.
- `waitFor`: Ensures the test does not exit until given promise settles.
- `assert`: Simple assertion call that expects a boolean.
- `cover`: Sets a coverage goal for the given url.

### Events

- `x-test-ping`: root responds ('x-test-pong', { status: 'started'|'ended' })
- `x-test-ended`: all tests have completed or we bailed out
- `x-test-cover-start`: root responds ('x-test-cover-ended')
- `x-test-cover`: [internal] signal to test for coverage on a particular file
- `x-test-bail`: [internal] signal to quit test early
- `x-test-queue`: [internal] queues a new test
- `x-test-next`: [internal] destroy current test and create a new one
- `x-test-it-started`: [internal] user defined a new "it"
- `x-test-it-ended`: [internal] user-defined "it" completed

### Parameters

The following parameters can be passed in via a url `search`:

- `x-test-no-reporter`: turns off custom reporting tool ui
- `x-test-cover`: turns on coverage reporting**

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
