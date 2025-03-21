# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
