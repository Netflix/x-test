# @netflix/x-test-client

a node.js client for `x-test`

## Installation

```bash
npm install --save-dev @netflix/x-test-client
```

## Command Line Usage

The `x-test-client` provides a unified CLI for running browser tests with
different automation tools.

### Basic Usage

```bash
x-test --client=puppeteer --url=http://localhost:8080/test/ --coverage=true
```

### Arguments

- `--client` - Test automation client to use (required)
  - `puppeteer` - Use Puppeteer with Chrome
- `--url` - URL to the test page (required)
- `--coverage` - Enable coverage collection (`true` or `false`)
- `--test-name` - Filter tests by name using regex pattern (optional)

### Examples

Run all tests with coverage:
```bash
x-test --client=puppeteer --url=http://localhost:8080/test/ --coverage=true
```

Run specific tests by name:
```bash
x-test --client=puppeteer --url=http://localhost:8080/test/ --coverage=false --test-name="should validate"
```

### Test Filtering

The `--test-name` argument accepts a regex pattern that matches against the full
test name, including any parent `describe` block names joined with spaces.

### TAP Output

The client outputs TAP Version 14 compliant results and validates the TAP
stream internally. If any tests fail, the process will exit with code 1.

## Browser vs Client Packages

- `@netflix/x-test` - Browser-side test runner and utilities
- `@netflix/x-test-client` - Node.js automation clients and CLI tools

For browser usage and test writing, see the main
[@netflix/x-test](../README.md) documentation.
