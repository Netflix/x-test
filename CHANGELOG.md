# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-05-03

### Added

- `test` and `test.*` now accept an optional `options` object as the second
  argument — `test(name, options, fn)` — matching `node:test` call signature.
  The only supported option is `timeout` (number, in milliseconds). Every valid
  x-test call is a valid `node:test` call (#99).
- All public API functions (`assert`, `assert.deepEqual`, `assert.throws`,
  `assert.rejects`, `load`, `suite`, `suite.*`, `test`, `test.*`) now validate
  their arguments strictly: wrong argument count, wrong types, or invalid option
  keys throw immediately with a descriptive error pointing at the call site.
- `assert.throws(fn, error, message?)` and `assert.rejects(fn, error, message?)`
  for asserting that a function throws or an async function rejects. The `error`
  argument is a `RegExp` tested against `String(thrown)` (consistent with
  `node:assert`) (#99).
- `assert.deepEqual(actual, expected, message?)` for strict deep-equality
  comparison of primitives, plain objects, and arrays. Unsupported types
  (Map, Set, Date, RegExp, class instances, functions) throw rather than
  compare, so support can be broadened later without breaking callers (#99).
- Adds TypeScript support for top-level exports from `x-test`. Previously, it
  the integration with TypeScript applications was not smooth (#68, #75).
- Adds “?x-test-name-pattern” query param to enable filtering of tests based on
  the given pattern name. This is done internally so it will work in both a
  browser and a CLI output (#58).

### Changed

- Assertion failures now show only user code in the stack trace. Internal
  x-test frames are stripped via `Error.captureStackTrace` (Chromium / V8), and
  callbacks are deferred to a fresh micro task so that BroadcastChannel
  machinery does not appear below user frames (#106).
- Renamed `it` to `test` and `describe` to `suite` across the entire public API
  and all internal concepts. `import { test, suite, assert, load }` is now the
  canonical import.
- Renamed `test(href)` load function to `load(href)`. Conceptually, when you
  call this function you “load a new frame with this href” (#99).
- Typed `assert` as a proper TypeScript assertion function (`asserts ok`) so
  that type narrowing works automatically after assertions (#74).
- Updated dependencies, including major bumps to ESLint (9.x → 10.x) and
  TypeScript (5.x → 6.x). Added `globals` as an explicit dev dependency.
- The “@netflix/x-test-cli” is now packaged separately and is imported here like
  any other dev dependency.
- Communications happen through a `BroadcastChannel` instead of `top`. This is
  better since it doesn’t use globals. Instead, a more targeted `x-test` channel
  is utilized for client <<>> root <<>> suite communications (#51).

### Removed

- Asynchronous registration via `waitFor` is removed — synchronous imports
  (including `import ... with { type: 'json' }`) handle fixture data, and `test`
  callbacks may still be async for per-test work (#80).
- The `coverage()` API, the `x-test-run-coverage` URL
  parameter, and all associated TAP output have been removed. Coverage
  analysis is now the exclusive responsibility of `@netflix/x-test-cli` (#99).
- The `x-test-no-reporter` URL parameter has been removed.
  The reporter UI is now always rendered (#99).
- The public `BroadcastChannel` events `x-test-client-ping`,
  `x-test-root-pong`, `x-test-root-coverage-request`,
  `x-test-client-coverage-result`, and `x-test-root-end` have been removed.
  The CLI now observes a run solely by consuming TAP output from the
  console (#99).

### Fixed

- TAP version pragma now emits `TAP version 14` (lower-case `v`) to
  match the TAP specification text (#88).
- Suites no longer bail with “Timed out loading …” partway through an
  otherwise successful run. When the child’s `ready` beat its iframe
  load event, the iframe was removed before load could dispatch and
  the load-phase timer later settled a stale race (#83).
- Iframes pointed at bad URLs (404, 500, SPA fallbacks, unreachable
  hosts) now fail cleanly with a clear error instead of silently
  passing as `1..0 ok` or hanging (#82).
- Multiple `<script type="module">` tags in one HTML file now all
  register tests into the same suite. Previously only the first
  script’s registrations survived; the rest were silently dropped (#81).

### Security

- NPM token lives in a GH environment for publish action (more secure).

## [1.0.3] - 2025-03-18

### Fixed

- Don’t fail strict integrator CSP rules. Previously, we inlined some <style>
  tags which would fail for a rule set like `default-src 'self';`. To ensure we
  don’t reintroduce — strict CSP headers are now added to all test documents.

## [1.0.1] - 2024-06-14

### Fixed

- Changed “root” detection to something other than the “id” attribute.

## [1.0.0] - 2024-02-29

### Added

- Initial interface for `1.x` is locked down.
