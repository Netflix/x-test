# x-test

a simple, tap-compliant test runner for the browser

```js
import { load, suite, test, assert } from '@netflix/x-test';

load('./test-other-important-things.html');

suite('important feature', () => {
  test('should work synchronously', () => {
    assert(MyFeature.works() === 'worked', 'it did not work');
  });

  test('should work asynchronously', async () => {
    assert(await MyFeature.isAwesome() === 'awesome', 'it is not awesome');
  });

  test('should match interface', () => {
    assert.deepEqual(MyFeature.interface, { version: '123' }, 'does not match');
  });

  test('should throw on bad input', () => {
    assert.throws(() => MyFeature.doThing(null), /^Error: bad input$/);
  });

  test('should reject on bad async input', async () => {
    await assert.rejects(() => MyFeature.doThingAsync(null), /^Error: bad input$/);
  });
});
```

## Spec

- importable as `type="module"`
- is interoperable with TAP Version 14
- nested sub-tests run in an iframe
- has a recognizable testing interface (`suite`, `test`, `assert`)
- can be used for automated testing

## Interface

### Testing

The following are exposed in the testing interface:

- `load`: Creates a sub-test in an `iframe` based on given html `href`.
- `test`: The smallest testing unit — can be asynchronous.
- `test.skip`: A `test` whose callback is not run and which will pass.
- `test.only`: Skip all other `test` tests.
- `test.todo`: A `test` whose callback _is_ run and is expected to fail.
- `suite`: Simple synchronous grouping functionality.
- `suite.skip`: Skip all `test` tests in this group.
- `suite.only`: Skip all other `suite` groups and `test` tests.
- `suite.todo`: Mark all `test` tests within this group as _todo_.
- `assert`: Simple assertion call that throws if the boolean input is false-y.
- `assert.deepEqual`: Strict deep-equality assertion for primitives, plain objects, and arrays.
- `assert.throws`: Asserts that a function throws, matching the thrown value against a RegExp.
- `assert.rejects`: Asserts that an async function rejects, matching the rejection against a RegExp.

### Parameters

The following parameters can be passed in via query params on the url:

- `x-test-name-pattern`: filters tests by name using regex pattern matching

## Execution

Both `load` and `test` calls will execute _in order_. `load` calls will boot the
given html page in an iframe. Such iframes are run one-at-a-time. All invoked
`test` calls await the completion of previously-invoked `test` calls.

## Recipes

### Data-driven tests from a JSON fixture

Use [Import Attributes / JSON Modules][json-modules] to pull fixture data
synchronously at module-load time. Because the data is available before any
`test` call, you can declare one test per row without any async bookkeeping:

```js
import data from './my-fixture.json' with { type: 'json' };
import { test, assert } from '../x-test.js';

for (const testCase of data) {
  test(`testing ${testCase.name}`, () => {
    assert(testCase.expected === testCase.actual, testCase.name);
  });
}
```

### Shared async fixture across multiple `test`s

If multiple tests need the same result of an async operation, kick off one
promise at module scope and `await` it inside each `test`. The promise resolves
once; every `test` that awaits it gets the same value. Registration stays
synchronous — only the test bodies do async work.

```js
import { test, assert } from '../x-test.js';

const fetchPromise = fetch('/api/widgets').then(response => response.text());

test('has widgets', async () => {
  const body = await fetchPromise;
  assert(body.length > 0);
});

test('body mentions a known widget', async () => {
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
