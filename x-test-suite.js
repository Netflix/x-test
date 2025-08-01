export class XTestSuite {
  static timeout = Symbol('timeout');

  static initialize(context, testId, href) {
    Object.assign(context.state, { testId, href });
    context.state.parents.push({ type: 'test', testId });
    context.subscribe(async event => {
      switch (event.data.type) {
        case 'x-test-suite-bail':
          XTestSuite.onBail(context, event);
          break;
        case 'x-test-root-run':
          XTestSuite.onRun(context, event);
          break;
        default:
          // Ignore — this message isn't for us.
      }
    });

    // Setup global error / rejection handlers.
    context.addErrorListener(event => {
      event.preventDefault();
      XTestSuite.bail(context, event.error);
    });
    context.addUnhandledrejectionListener(event => {
      event.preventDefault();
      XTestSuite.bail(context, event.reason);
    });

    // Await a single microtask before we signal that we're ready.
    XTestSuite.waitFor(context, Promise.resolve());
  }

  static onBail(context/*, event*/) {
    if (!context.state.bailed) {
      context.state.bailed = true;
    }
  }

  static async onRun(context, event) {
    if (
      !context.state.bailed &&
      context.state.callbacks[event.data.data.itId]
    ) {
      const { itId, directive, interval } = event.data.data;
      try {
        if (directive !== 'SKIP') {
          const callback = context.state.callbacks[itId];
          const resolvedInterval = interval ?? 30_000;
          const timeout = await Promise.race([callback(), context.timeout(resolvedInterval)]);
          if (timeout === XTestSuite.timeout) {
            throw new Error(`timeout after ${resolvedInterval.toLocaleString()}ms`);
          }
        }
        context.publish('x-test-suite-result', { itId, ok: true, error: null });
      } catch (error) {
        error = XTestSuite.createError(error); // eslint-disable-line no-ex-assign
        context.publish('x-test-suite-result', { itId, ok: false, error });
      }
    }
  }

  static bail(context, error) {
    if (!context.state.bailed) {
      context.state.bailed = true;
      context.publish(
        'x-test-suite-bail',
        { testId: context.state.testId, error: XTestSuite.createError(error) }
      );
    }
  }

  static createError(originalError) {
    const error = {};
    if (originalError instanceof Error) {
      Object.assign(error, { message: originalError.message, stack: originalError.stack });
    } else {
      error.message = String(originalError);
    }
    return error;
  }

  static assert(context, ok, text) {
    if (context && !context.state.bailed) {
      if (!ok) {
        throw new Error(text ?? 'not ok');
      }
    }
  }

  static coverage(context, href, goal) {
    if (context && !context.state.bailed) {
      if (!(goal >= 0 && goal <= 100)) {
        throw new Error(`Unexpected goal percentage "${goal}".`);
      }
      const coverageId = context.uuid();
      const url = new URL(href, context.state.href);
      context.publish('x-test-suite-register', { type: 'coverage', coverageId, href: url.href, goal });
    }
  }

  static test(context, href) {
    if (context && !context.state.bailed && !context.state.ready) {
      const testId = context.uuid();
      const testHref = new URL(href, context.state.href).href;
      const initiatorTestId = context.state.testId;
      context.publish('x-test-suite-register', { type: 'test', testId, initiatorTestId, href: testHref });
    }
  }

  static #describerInner(context, text, callback, directive, only) {
    if (context && !context.state.bailed && !context.state.ready) {
      if (!(callback instanceof Function)) {
        throw new Error(`Unexpected callback value "${callback}".`);
      }
      const describeId = context.uuid();
      const parents = [...context.state.parents];
      directive = directive ?? null;
      only = only ?? false;
      context.publish(
        'x-test-suite-register',
        { type: 'describe-start', describeId, parents, text, directive, only }
      );
      try {
        context.state.parents.push({ type: 'describe', describeId });
        callback();
        context.state.parents.pop();
        context.publish('x-test-suite-register', { type: 'describe-end', describeId });
      } catch (error) {
        XTestSuite.bail(context, error);
      }
    }
  }

  static describe(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback);
  }

  static describeSkip(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback, 'SKIP');
  }

  static describeOnly(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback, null, true);
  }

  static describeTodo(context, text, callback) {
    XTestSuite.#describerInner(context, text, callback, 'TODO');
  }

  static #itInner(context, text, callback, interval, directive, only) {
    if (context && !context.state.bailed && !context.state.ready) {
      if (!(callback instanceof Function)) {
        throw new Error(`Unexpected callback value "${callback}".`);
      }
      const itId = context.uuid();
      const parents = [...context.state.parents];
      interval = interval ?? null;
      directive = directive ?? null;
      only = only ?? false;
      context.state.callbacks[itId] = callback;
      context.publish(
        'x-test-suite-register',
        { type: 'it', itId, parents, text, interval, directive, only }
      );
    }
  }

  static it(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval);
  }

  static itSkip(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval, 'SKIP');
  }

  static itOnly(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval, null, true);
  }

  static itTodo(context, text, callback, interval) {
    XTestSuite.#itInner(context, text, callback, interval, 'TODO');
  }

  static async waitFor(context, promise) {
    if (context && !context.state.bailed) {
      if (!context.state.bailed) {
        const waitForId = context.uuid();
        context.state.waitForId = waitForId;
        context.state.promises.push(promise);
        try {
          await Promise.all(context.state.promises);
          if (context.state.waitForId === waitForId) {
            context.state.ready = true;
            context.publish('x-test-suite-ready', { testId: context.state.testId });
          }
        } catch (error) {
          XTestSuite.bail(context, error);
        }
      }
    }
  }
}
