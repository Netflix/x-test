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

- `load`: Creates a sub-test in an `iframe` based on given `src` html page.
- `it`: The smallest testing unit — can be asynchronous.
- `it.skip`: An `it` whose callback is not run and which will pass.
- `it.only`: Skip all other `it` tests.
- `it.todo`: An `it` whose callback _is_ run and is expected to fail.
- `describe`: Simple synchronous grouping functionality.
- `describe.skip`: Skip all `it` tests in this group.
- `describe.only`: Skip all other `describe` groups and `it` tests.
- `describe.todo`: Mark all `it` tests within this group as _todo_.
- `assert`: Simple assertion call that throws if the boolean input is false-y.
- `assert.deepEqual`: Strict deep-equality assertion for primitives, plain objects, and arrays.

### Parameters

The following parameters can be passed in via query params on the url:

- `x-test-name-pattern`: filters tests by name using regex pattern matching

## Execution

Both `load` and `it` calls will execute _in order_. `load` calls will boot the
given html page in an iframe. Such iframes are run one-at-a-time. All invoked
`it` calls await the completion of previously-invoked `it` calls.

## Recipes

### Data-driven tests from a JSON fixture

Use [Import Attributes / JSON Modules][json-modules] to pull fixture data
synchronously at module-load time. Because the data is available before any `it`
call, you can declare one test per row without any async bookkeeping:

```js
import data from './my-fixture.json' with { type: 'json' };
import { it, assert } from '../x-test.js';

for (const testCase of data) {
  it(`testing ${testCase.name}`, () => {
    assert(testCase.expected === testCase.actual, testCase.name);
  });
}
```

### Shared async fixture across multiple `it`s

If multiple tests need the same result of an async operation, kick off one
promise at module scope and `await` it inside each `it`. The promise resolves
once; every `it` that awaits it gets the same value. Registration stays
synchronous — only the test bodies do async work.

```js
import { it, assert } from '../x-test.js';

const fetchPromise = fetch('/api/widgets').then(response => response.text());

it('has widgets', async () => {
  const body = await fetchPromise;
  assert(body.length > 0);
});

it('body mentions a known widget', async () => {
  const body = await fetchPromise;
  assert(body.includes('sprocket'));
});
```

Both patterns compose: import a JSON fixture for one thing, kick off a shared
promise for another, and mix them freely in the same test file.

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

[json-modules]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with
