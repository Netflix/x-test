# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `assert.deepEqual(actual, expected, message?)` for strict deep-equality
  comparison of primitives, plain objects, and arrays. Unsupported types
  (Map, Set, Date, RegExp, class instances, functions) throw rather than
  compare, so support can be broadened later without breaking callers (#99).

### Changed

- The `x-test-name` URL parameter has been renamed to `x-test-name-pattern`
  to more clearly signal that it accepts a regex pattern rather than a
  literal name and matches Node’s test CLI argument naming (#99).

### Removed

- Asynchronous registration via `waitFor` is removed — synchronous imports
  (including `import ... with { type: 'json' }`) handle fixture data, and `it`
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

## [2.0.0-rc.7] - 2026-04-22

### Added

- Summarize errors encountered during the test run as diagnostics under a
  `# Failures:` header. This allows both humans and machines to “tail” the
  output (versus having to understand the entire output at all times) (#89).

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

## [2.0.0-rc.6] - 2026-03-23

### Changed

- Typed `assert` as a proper TypeScript assertion function (`asserts ok`) so
  that type narrowing works automatically after assertions (#74).
- Updated dependencies, including major bumps to ESLint (9.x → 10.x) and
  TypeScript (5.x → 6.x). Added `globals` as an explicit dev dependency.
- Renamed `types` npm script to `type` for better consistency with the naming
  in the related `x-element` repository (#75).

## [2.0.0-rc.5] - 2026-01-09

### Added

- The “/test” and “/demo” files are restored in the published file set.
- NPM token lives in a GH environment for publish action (more secure).

## [2.0.0-rc.3] - 2025-11-06

### Added

- Adds TypeScript support for top-level exports from `x-test`. Previously, it
  the integration with TypeScript applications was not smooth (#68).

## [2.0.0-rc.2] - 2025-10-24

### Changed

- The “@netflix/x-test-cli” is now packaged separately and is imported here like
  any other dev dependency.

## [2.0.0-rc.1] - 2025-10-23

### Added

- Adds “x-test-name” query param to enable filtering of tests based on the given
  pattern name. This is done internally so it will work in both a browser and
  a CLI output (#58).

### Changed

- Communications happen through a `BroadcastChannel` instead of `top`. This is
  better since it doesn’t use globals. Instead, a more targeted `x-test` channel
  is utilized for client <<>> root <<>> suite communications (#51).
- The “/test” and “/demo” files are removed from the published file set.

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
