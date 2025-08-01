# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

The x-test utility is a simple, TAP-compliant test runner for the browser. It
allows you to run tests directly in the browser using a familiar testing
interface (`it`, `describe`, `assert`) while producing TAP Version 14 output.

## Development Commands

### Development Server
- `npm start` - Start the development server on port 8080
- The server serves static files and supports directory indexing

### Testing
- `npm test` - Run all tests using Puppeteer and output TAP format
- `node test.js | tap-parser -l` - Run tests with formatted output

### Code Quality
- `npm run lint` - Run ESLint with zero warnings allowed

### Version Management
- `npm run bump` - Run the bump script (./bump.sh) to increment version

## Architecture

### Core Components

1. **x-test.js** - Main entry point that exports public API (`it`, `describe`, `assert`, `test`, `coverage`, `waitFor`) and coordinates initialization between root and suite contexts

2. **x-test-root.js** - Root test coordinator (`XTestRoot`) that:
   - Manages overall test execution flow and scheduling
   - Handles iframe creation and coordination
   - Processes test registration and results
   - Outputs TAP-compliant format

3. **x-test-suite.js** - Individual test suite manager (`XTestSuite`) that:
   - Runs within iframes for isolated test execution
   - Handles test assertions and error catching
   - Manages describe/it registration and callbacks
   - Communicates results back to root via postMessage

4. **x-test-reporter.js** - Browser UI component (`XTestReporter`) that:
   - Provides real-time visual feedback during test execution
   - Parses and displays TAP output with syntax highlighting
   - Includes resizable interface with persistent state

5. **x-test-reporter.css.js** - Stylesheet for the reporter component with:
   - Monospace styling and color scheme for test output
   - Interactive controls and responsive design
   - Support for TAP formatting and indentation

6. **x-test-tap.js** - TAP format output generator (`XTestTap`) that:
   - Creates TAP Version 14 compliant output
   - Handles test lines, diagnostics, and YAML blocks
   - Manages proper indentation for nested tests

7. **server.js** - Development HTTP server with:
   - Static file serving with MIME type detection
   - Directory indexing with fallback to root index.html
   - Support for custom headers via environment variables

8. **test.js** - Puppeteer-based test runner that:
   - Launches headless Chrome with coverage collection
   - Communicates with x-test via postMessage API
   - Outputs TAP-compliant results to stdout

### Test Execution Flow

Each test defines an html document which runs in an iframe:
- Root page coordinates overall test execution
- Each `test()` call creates a new iframe running that test file
- Individual `it()` calls within each iframe execute sequentially
- Results bubble up through postMessage communication
- Output is TAP

### Key Patterns

- **Event-driven communication**: Uses postMessage for iframe coordination
- **TAP compliance**: All output follows TAP Version 14 specification
- **Sequential execution**: Both `test()` and `it()` calls run in declared order
- **Coverage integration**: Optional code coverage via Puppeteer's built-in coverage
- **Error handling**: Global error/rejection handlers with proper TAP bailout

## File Structure

- `/demo/` - Example test files showing various usage patterns
- `/test/` - Internal tests for the x-test library itself
- Main files: `x-test.js`, `x-test-root.js`, `x-test-suite.js`, `x-test-reporter.js`, `x-test-reporter.css.js`, `x-test-tap.js`, `server.js`, `test.js`
- Config: `package.json`, `eslint.config.js`, `deno.json`

## Testing Patterns

When writing tests:
- Use `test('https://fully-qualified/path.html')` for iframe-based sub-tests
- Use `it()` for individual test cases
- Use `describe()` for logical grouping
- Use `assert(condition, message)` for assertions
- Use `coverage(href, percentage)` to set coverage goals
- Use `.skip`, `.only`, `.todo` modifiers as needed

## Development Notes

- Node.js >= 20.18 and npm >= 10.8 required
- Browser tests run via Puppeteer automation
- All code follows strict ESLint rules (see eslint.config.js)
- Published as @netflix/x-test on npm registry
- Apache 2.0 licensed
