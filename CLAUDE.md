# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

The x-test utility is a simple, TAP-compliant test runner for the browser. It
allows you to run tests directly in the browser using a familiar testing
interface (`it`, `describe`, `assert`) while producing TAP Version 14 output.

The repository is structured as an npm workspace with two packages:
- `@netflix/x-test` - Browser-side test runner and utilities
- `@netflix/x-test-client` - Node.js automation clients and CLI tools

## Development Commands

### Development Server
- `npm start` - Start the development server on port 8080
- The server serves static files and supports directory indexing

### Testing
- `npm test` - Run tests using the x-test CLI with Puppeteer Chrome
- `npm run test:puppeteer:chrome` - Run tests with Puppeteer Chrome (same as above)

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

#### Client Package Components  
8. **client/x-test-client.js** - Main CLI entry point that:
   - Handles command-line argument parsing and validation
   - Dispatches to appropriate automation clients
   - Provides unified interface for all client tools

9. **client/x-test-client-common.js** - Shared utilities (`XTestClientCommon`) for:
   - BroadcastChannel communication with x-test
   - Test readiness detection and coverage data exchange
   - TAP bailout functionality for error scenarios

10. **client/x-test-client-puppeteer.js** - Puppeteer-specific client that:
    - Handles browser launch with Chrome DevTools coverage
    - Uses x-test-client-common for communication
    - Outputs TAP-compliant results with internal validation

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
├── /client/                  # Client package (@netflix/x-test-client)
│   ├── x-test-client.js      # Main CLI entry point
│   ├── x-test-client-common.js # Shared utilities
│   ├── x-test-client-puppeteer.js # Puppeteer automation
│   ├── package.json          # Client package configuration
│   ├── jsr.json              # Client JSR configuration
│   └── README.md             # Client documentation
├── server.js                 # Development HTTP server
├── x-test*.js                # Core browser components  
├── package.json              # Root package configuration
├── eslint.config.js          # Linting rules
└── jsr.json                  # Root JSR configuration
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

### Command Line Interface

The primary way to run automated tests is through the x-test CLI:

```bash
x-test --client=puppeteer --url=http://localhost:8080/test/ --coverage=true
```

Available arguments:
- `--client=puppeteer` - Use Puppeteer with Chrome (required)
- `--url=<url>` - URL to test page (required)  
- `--coverage=true|false` - Enable coverage collection
- `--test-name=<pattern>` - Filter tests by regex pattern

### Programmatic Usage

While primarily designed as a CLI, you can also import the client programmatically:

```javascript
// Import the CLI entry point
import '@netflix/x-test-client';

// The individual clients are internal implementation details
// and not exported for external use
```

## Development Notes

- Node.js >= 20.18 and npm >= 10.8 required
- Repository uses npm workspaces with two packages
- Browser tests use Puppeteer automation with Chrome
- Coverage collection only available in Chromium-based browsers
- All code follows strict ESLint rules (see eslint.config.js)
- Uses BroadcastChannel API for cross-context communication
- Published as @netflix/x-test and @netflix/x-test-client on npm registry
- Also published to JSR registry
- Apache 2.0 licensed
