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
- `npm test` - Run all browser/tool combinations sequentially
- `npm run test:puppeteer:chrome` - Run tests with Puppeteer Chrome
- `npm run test:playwright:chrome` - Run tests with Playwright Chrome (with coverage)
- `npm run test:playwright:firefox` - Run tests with Playwright Firefox (no coverage)
- `npm run test:playwright:webkit` - Run tests with Playwright WebKit (no coverage)

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

#### Node.js Components  
7. **node/server.js** - Development HTTP server with:
   - Static file serving with MIME type detection
   - Directory indexing with root-to-demo redirect
   - Support for custom headers via environment variables

8. **node/x-test-client.js** - Generic client helper for external test runners:
   - BroadcastChannel communication with x-test
   - Test readiness detection and coverage data exchange
   - TAP bailout functionality for error scenarios

9. **node/x-test-client-puppeteer.js** - Puppeteer-specific client that:
   - Handles browser launch with Chrome DevTools coverage
   - Uses generic x-test-client for communication
   - Outputs TAP-compliant results

10. **node/x-test-client-playwright.js** - Playwright-specific client that:
    - Supports multiple browsers (chromium, firefox, webkit)
    - Normalizes Playwright coverage format to x-test format
    - Handles browser-specific capability detection

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
- **Modular clients**: Separate clients for different automation tools with normalized interfaces
- **Coverage integration**: Chromium-based coverage with tool-specific format normalization
- **Error handling**: Global error/rejection handlers with proper TAP bailout

## File Structure

```
/
├── /demo/                    # Example usage patterns
├── /test/                    # Internal x-test library tests
├── /node/                    # Node.js-specific components
│   ├── server.js             # Development server
│   ├── x-test-client*.js     # Test automation clients
│   └── test-*.js             # Test runner scripts for different browsers
├── x-test*.js                # Core browser components  
├── package.json              # Package configuration
├── eslint.config.js          # Linting rules
└── deno.json                 # Deno configuration
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

## Client Usage

For external test automation:

```javascript
// Puppeteer
import { XTestPuppeteerClient } from '@netflix/x-test/x-test-client-puppeteer.js';
await XTestPuppeteerClient.run({
  url: 'http://localhost:8080/test/',
  coverage: true,
  launchOptions: { headless: true }
});

// Playwright  
import { XTestPlaywrightClient } from '@netflix/x-test/x-test-client-playwright.js';
import { chromium } from 'playwright';
await XTestPlaywrightClient.run({
  url: 'http://localhost:8080/test/',
  coverage: true, // Only works with Chromium browsers
  browser: chromium
});
```

## Development Notes

- Node.js >= 20.18 and npm >= 10.8 required
- Browser tests support multiple automation tools (Puppeteer, Playwright) 
- Coverage collection only available in Chromium-based browsers
- All code follows strict ESLint rules (see eslint.config.js)
- Uses BroadcastChannel API for cross-context communication
- Published as @netflix/x-test on npm registry
- Apache 2.0 licensed
