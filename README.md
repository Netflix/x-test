# x-test

a simple, tap-compliant test runner for the browser

## Spec

- importable as `type="module"`
- is interoperable with TAP Version 14
- nested sub-tests run in an iframe
- has a recognizable testing interface (`it`, `describe`, `assert`)
- can be used for automated testing

## Interface

### Testing

The following are exposed in the testing interface:

- `test`: Creates a sub-test in an `iframe` based on given `src` html page.
- `it`: The smallest testing unit — can be asynchronous.
- `it.skip`: An `it` whose callback is not run and which will pass.
- `it.only`: Skip all other `it` tests.
- `it.todo`: An `it` whose callback _is_ run and is expected to fail.
- `describe`: Simple synchronous grouping functionality.
- `describe.skip`: Skip all `it` tests in this group.
- `describe.only`: Skip all other `describe` groups and `it` tests.
- `describe.todo`: Mark all `it` tests within this group as _todo_.
- `waitFor`: Ensures test registration remains open until given promise settles.
- `assert`: Simple assertion call that throws if the boolean input is false-y.
- `assert.deepEqual`: Strict deep-equality assertion for primitives, plain objects, and arrays.

### Parameters

The following parameters can be passed in via query params on the url:

- `x-test-name-pattern`: filters tests by name using regex pattern matching

## Execution

Both `test` and `it` calls will execute _in order_**. `test` calls will boot the
given html page in an iframe. Such iframes are run one-at-a-time. All invoked
`it` calls await the completion of previously-invoked `it` calls.

**This is not the case if you nest `it`--but that's an anti-pattern anyhow.

## Test Filtering

You can filter tests by name using the `x-test-name-pattern` query parameter, which accepts a regex pattern. This allows you to run only specific tests that match the pattern.

### Browser Usage
```
http://localhost:8080/test/?x-test-name-pattern=should%20validate
```

### Command Line Usage

For automated testing with a Node.js CLI, see the
[@netflix/x-test-cli](https://github.com/Netflix/x-test-cli) package documentation.

## Parsing TAP

There are many TAP formatters. Importantly, as long as you can pipe the TAP
output to another program, the output should be interoperable.
