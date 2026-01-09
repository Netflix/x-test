# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0-rc.4] - 2026-01-09

### Added

-  The “/test” and “/demo” files are restored in the published file set.

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
