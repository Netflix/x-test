# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

The x-test utility is a simple, TAP-compliant test runner for the browser. It
allows you to run tests directly in the browser using a familiar testing
interface (`it`, `describe`, `assert`) while producing TAP Version 14 output.

This repository contains the `@netflix/x-test` package - the browser-side test
runner and utilities. For automated test execution and CI/CD integration, see
the separate `@netflix/x-test-cli` package.

## Development Commands

### Development Server
- `npm start` - Start the development server on port 8080
- The server serves static files and supports directory indexing

### Testing
- `npm test` - Run tests using @netflix/x-test-cli with Puppeteer Chrome
- Tests can also be run by opening test HTML files directly in a browser

### Code Quality
- `npm run lint` - Run ESLint with zero warnings allowed

### Version Management
- `npm run bump` - Run the bump script (./bump.sh) to increment version

## Architecture

### Core Components

#### Browser Components
1. **x-test.js** - Main library entry point containing:
   - Public API exports (`it`, `describe`, `assert`, `test`, `coverage`, `waitFor`)
   - BroadcastChannel-based communication setup
   - Root/suite context initialization logic
   - UUID generation and utility functions

2. **x-test-root.js** - Root test coordinator (`XTestRoot`) that:
   - Manages overall test execution flow and scheduling  
   - Handles iframe creation and coordination
   - Processes test registration and results
   - Outputs TAP-compliant format with coverage analysis

3. **x-test-suite.js** - Individual test suite manager (`XTestSuite`) that:
   - Runs within iframes for isolated test execution
   - Handles test assertions, timeouts, and error catching
   - Manages describe/it registration and callbacks
   - Communicates results back to root via BroadcastChannel

4. **x-test-reporter.js** - Browser UI component (`XTestReporter`) that:
   - Provides real-time visual feedback during test execution
   - Parses and displays TAP output with syntax highlighting
   - Includes resizable interface with persistent localStorage state

5. **x-test-reporter.css.js** - Constructable stylesheet for the reporter component

6. **x-test-tap.js** - TAP Version 14 output generator (`XTestTap`) with proper indentation and formatting

#### Development Server
7. **server.js** - Development HTTP server with:
   - Static file serving with MIME type detection
   - Directory indexing with root-to-demo redirect
   - Support for custom headers via environment variables

### Test Execution Flow

Each test defines an HTML document which runs in an iframe:
- Root page coordinates overall test execution via BroadcastChannel
- Each `test()` call creates a new iframe running that test file
- Individual `it()` calls within each iframe execute sequentially with optional timeouts
- Results bubble up through BroadcastChannel communication
- Output is TAP Version 14 compliant

### Key Patterns

- **Event-driven communication**: Uses BroadcastChannel for cross-context messaging
- **TAP compliance**: All output follows TAP Version 14 specification
- **Sequential execution**: Both `test()` and `it()` calls run in declared order
- **Iframe isolation**: Each test runs in its own isolated iframe context
- **Error handling**: Global error/rejection handlers with proper TAP bailout

## File Structure

```
/
├── /demo/                    # Example usage patterns
├── /test/                    # Internal x-test library tests
├── server.js                 # Development HTTP server
├── x-test*.js                # Core browser components
├── package.json              # Package configuration
├── eslint.config.js          # Linting rules
└── jsr.json                  # JSR configuration
```

## Testing Patterns

When writing tests:
- Use `test('https://fully-qualified/path.htm')` for iframe-based sub-tests
- Use `it(description, callback, timeout)` for individual test cases
- Use `describe(description, callback)` for logical grouping
- Use `assert(condition, message)` for assertions
- Use `coverage(href, percentage)` to set coverage goals
- Use `waitFor(promise)` to delay test completion until promise resolves
- Use `.skip`, `.only`, `.todo` modifiers as needed on both `describe` and `it`

## Automation and CI/CD

For automated test execution and CI/CD integration, use the `@netflix/x-test-cli`
package (maintained in a separate repository). The CLI tool provides:

- Browser automation with Puppeteer
- TAP output parsing and validation
- Code coverage collection and analysis
- Test filtering and execution control

x-test can also be run directly by opening test HTML files in any browser, making
it suitable for manual testing and debugging.

## Development Notes

- Node.js >= 20.18 and npm >= 10.8 required
- x-test runs entirely in the browser with no build step
- Automated testing requires `@netflix/x-test-cli` (separate package/repository)
- Coverage collection only available in Chromium-based browsers
- All code follows strict ESLint rules (see eslint.config.js)
- Uses BroadcastChannel API for cross-context communication
- Published as @netflix/x-test on npm registry and JSR
- Apache 2.0 licensed
