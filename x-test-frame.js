import { XTestCommon } from './x-test-common.js';

export class XTestFrame {
  /**
   * @param {any} context
   * @param {any} frameId
   * @param {any} href
   */
  static async initialize(context, frameId, href) {
    Object.assign(context.state, { frameId, href });
    context.publish('x-test-frame-initialize', { frameId });
    context.state.parents.push({ type: 'frame', frameId });
    context.subscribe(async (/** @type {any} */ event) => {
      switch (event.data.type) {
        case 'x-test-frame-bail':
          XTestFrame.onBail(context);
          break;
        case 'x-test-root-run':
          XTestFrame.onRun(context, event);
          break;
        default:
          // Ignore — this message isn't for us.
      }
    });

    // Setup global error / rejection handlers.
    /* x-test:coverage disable */ // Cannot test top-level error handlers.
    context.addErrorListener((/** @type {any} */ event) => {
      event.preventDefault();
      XTestFrame.bail(context, event.error);
    });
    context.addUnhandledrejectionListener((/** @type {any} */ event) => {
      event.preventDefault();
      XTestFrame.bail(context, event.reason);
    });
    /* x-test:coverage enable */

    // The registration window stays open until "DOMContentLoaded", which allows
    //  folks to import fixtures via JSON Modules and register tests before
    //  registration ends. Note that this does _NOT_ support top-level awaits.
    await context.domContentLoadedPromise;
    if (!context.state.bailed) {
      context.state.ready = true;
      context.publish('x-test-frame-ready', { frameId: context.state.frameId });
    }
  }

  /**
   * @param {any} context
   */
  static onBail(context/*, event*/) {
    if (!context.state.bailed) {
      context.state.bailed = true;
    }
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static async onRun(context, event) {
    if (
      !context.state.bailed &&
      context.state.callbacks[event.data.data.testId]
    ) {
      const { testId, directive, interval } = event.data.data;
      try {
        if (directive !== 'SKIP') {
          const callback = context.state.callbacks[testId];
          const resolvedInterval = interval ?? 30_000;
          // Create a new stack to remove some internal noise from stack trace on error.
          const timeout = await Promise.race([Promise.resolve().then(() => callback()), context.timeout(resolvedInterval)]);
          if (timeout === XTestCommon.TIMEOUT) {
            throw new Error(`timeout after ${resolvedInterval.toLocaleString()}ms`);
          }
        }
        context.publish('x-test-frame-result', { testId, ok: true, error: null });
      } catch (error) {
        error = XTestFrame.createError(error); // eslint-disable-line no-ex-assign
        context.publish('x-test-frame-result', { testId, ok: false, error });
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} error
   */
  static bail(context, error) {
    if (!context.state.bailed) {
      context.state.bailed = true;
      context.publish(
        'x-test-frame-bail',
        { frameId: context.state.frameId, error: XTestFrame.createError(error) }
      );
    }
  }

  /**
   * @param {any} originalError
   * @returns {{message: string, stack?: string}}
   */
  static createError(originalError) {
    const error = {};
    if (originalError instanceof Error) {
      Object.assign(error, { message: originalError.message, stack: originalError.stack });
    } else {
      error.message = String(originalError);
    }
    return error;
  }

  /**
   * @param {any} context
   * @param {any} caller
   * @param {any} value
   * @param {any} message
   */
  static assert(context, caller, value, message) {
    if (context && !context.state.bailed) {
      if (!value) {
        const error = new Error(message ?? 'not ok');
        /** @type {any} */ (Error).captureStackTrace?.(error, caller);
        throw error;
      }
    }
  }

  /**
   * Strict deep-equality check. Only supports primitives, plain objects, and
   * arrays. Throws a non-assertion error for unsupported types (Map, Set, Date,
   * class instances, functions, etc.) so the behavior can safely be expanded
   * later. This is meant to be a _strict_ subset of what is provided by
   * node:assert/strict#deepEqual (https://nodejs.org/api/assert.html).
   * @param {any} context
   * @param {any} caller
   * @param {any} actual
   * @param {any} expected
   * @param {any} [message]
   */
  static deepEqual(context, caller, actual, expected, message) {
    XTestFrame.assert(context, caller, XTestFrame.#deepEqual(actual, expected), message ?? 'not deep equal');
  }

  /**
   * @param {any} a
   * @param {any} b
   * @returns {boolean}
   */
  static #deepEqual(a, b) {
    if (Object.is(a, b)) {
      // If the objects are equal, we exit early.
      // Note: Object.is(NaN, NaN) === true, Object.is(+0, -0) === false;
      return true;
    } else if (
      (a === null || (typeof a !== 'object' && typeof a !== 'function')) ||
      (b === null || (typeof b !== 'object' && typeof b !== 'function'))
    ) {
      // If not equal, and one is a primitive value, we exit early.
      return false;
    }

    // Fail for mixed array/object.
    if (Array.isArray(a) !== Array.isArray(b)) {
      return false;
    }

    // Throw if object is not a plain object or array (Map, Set, Date, RegExp, etc).
    for (const value of [a, b]) {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) {
        throw new Error(`deepEqual only supports primitives, plain objects, and arrays (got ${value?.constructor?.name})`);
      }
    }

    // Fail if prototypes differ (e.g. Object.create(null) vs {}).
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      return false;
    }

    // Throw if either object has symbol-keyed properties.
    if (Object.getOwnPropertySymbols(a).length > 0 || Object.getOwnPropertySymbols(b).length > 0) {
      throw new Error('deepEqual does not support symbol-keyed properties.');
    }

    // Exit early if key length doesn't match.
    if (Object.keys(a).length !== Object.keys(b).length) {
      return false;
    }

    // Compare nested values / recurse.
    for (const key of Object.keys(a)) {
      if (!Object.hasOwn(b, key) || !XTestFrame.#deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * @param {any} context
   * @param {any} href
   */
  static load(context, href) {
    if (context && !context.state.bailed && !context.state.ready) {
      const frameId = context.uuid();
      const frameHref = new URL(href, context.state.href).href;
      const initiatorFrameId = context.state.frameId;
      context.publish('x-test-frame-register', { type: 'frame', frameId, initiatorFrameId, href: frameHref });
    }
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   * @param {any} directive
   * @param {any} only
   */
  static #suiteInner(context, text, callback, directive, only) {
    if (context && !context.state.bailed && !context.state.ready) {
      if (!(callback instanceof Function)) {
        throw new Error(`Unexpected callback value "${callback}".`);
      }
      const suiteId = context.uuid();
      const parents = [...context.state.parents];
      directive = directive ?? null;
      only = only ?? false;
      context.publish(
        'x-test-frame-register',
        { type: 'suite-start', suiteId, parents, text, directive, only }
      );
      try {
        context.state.parents.push({ type: 'suite', suiteId });
        callback();
        context.state.parents.pop();
        context.publish('x-test-frame-register', { type: 'suite-end', suiteId });
      } catch (error) {
        XTestFrame.bail(context, error);
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   */
  static suite(context, text, callback) {
    XTestFrame.#suiteInner(context, text, callback, null, null);
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   */
  static suiteSkip(context, text, callback) {
    XTestFrame.#suiteInner(context, text, callback, 'SKIP', null);
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   */
  static suiteOnly(context, text, callback) {
    XTestFrame.#suiteInner(context, text, callback, null, true);
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   */
  static suiteTodo(context, text, callback) {
    XTestFrame.#suiteInner(context, text, callback, 'TODO', null);
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   * @param {any} interval
   * @param {any} directive
   * @param {any} only
   */
  static #testInner(context, text, callback, interval, directive, only) {
    if (context && !context.state.bailed && !context.state.ready) {
      if (!(callback instanceof Function)) {
        throw new Error(`Unexpected callback value "${callback}".`);
      }
      const testId = context.uuid();
      const parents = [...context.state.parents];
      interval = interval ?? null;
      directive = directive ?? null;
      only = only ?? false;
      context.state.callbacks[testId] = callback;
      context.publish(
        'x-test-frame-register',
        { type: 'test', testId, parents, text, interval, directive, only }
      );
    }
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   * @param {any} interval
   */
  static test(context, text, callback, interval) {
    XTestFrame.#testInner(context, text, callback, interval, null, null);
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   * @param {any} interval
   */
  static testSkip(context, text, callback, interval) {
    XTestFrame.#testInner(context, text, callback, interval, 'SKIP', null);
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   * @param {any} interval
   */
  static testOnly(context, text, callback, interval) {
    XTestFrame.#testInner(context, text, callback, interval, null, true);
  }

  /**
   * @param {any} context
   * @param {any} text
   * @param {any} callback
   * @param {any} interval
   */
  static testTodo(context, text, callback, interval) {
    XTestFrame.#testInner(context, text, callback, interval, 'TODO', null);
  }
}
