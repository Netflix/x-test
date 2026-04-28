import { XTestReporter } from './x-test-reporter.js';
import { XTestCommon } from './x-test-common.js';
import { XTestTap } from './x-test-tap.js';

export class XTestRoot {
  /**
   * @param {any} context
   * @param {any} href
   */
  static initialize(context, href) {
    const url = new URL(href);
    context.state.reporter = new XTestReporter();
    document.body.append(context.state.reporter);
    const nameParam = url.searchParams.get('x-test-name-pattern');
    context.state.filtering = !!nameParam;
    context.state.namePattern = nameParam ? new RegExp(nameParam) : null;
    const versionStepId = context.uuid();
    const exitStepId = context.uuid();
    context.state.stepIds.push(versionStepId, exitStepId);
    context.state.steps[versionStepId] = { stepId: versionStepId, type: 'version', status: 'waiting' };
    context.state.steps[exitStepId] = { stepId: exitStepId, type: 'exit', status: 'waiting' };
    context.subscribe((/** @type {any} */ event) => {
      switch (event.data.type) {
        case 'x-test-root-defer':
          XTestRoot.onDefer(context, event);
          break;
        case 'x-test-frame-register':
          XTestRoot.onRegister(context, event);
          break;
        case 'x-test-frame-initialize':
          XTestRoot.onInitialize(context, event);
          break;
        case 'x-test-frame-ready':
          XTestRoot.onReady(context, event);
          break;
        case 'x-test-frame-result':
          XTestRoot.onResult(context, event);
          break;
        case 'x-test-frame-bail':
          XTestRoot.onBail(context, event);
          break;
      }
      XTestRoot.check(context);
    });

    // Run own tests in iframe.
    context.publish('x-test-frame-register', { type: 'frame', frameId: context.uuid(), href: url.href });
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onBail(context, event) {
    if (!context.state.ended) {
      XTestRoot.bail(context, event.data.data.error, { frameId: event.data.data.frameId });
    }
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onInitialize(context, event) {
    if (!context.state.ended) {
      const frameId = event.data.data.frameId;
      const frame = context.state.frames[frameId];
      frame.initialized = true;
    }
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onDefer(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      switch (data.type) {
        case 'check-initialized':
          XTestRoot.checkInitialized(context, data);
          break;
        default:
          throw new Error(`Unexpected defer type "${data.type}".`);
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static checkInitialized(context, data) {
    if (!context.state.ended) {
      const frame = context.state.frames[data.frameId];
      if (!frame.initialized) {
        XTestRoot.bail(context, new Error(`Failed to initialize ${data.href}`));
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerFrame(context, data) {
    if (!context.state.ended) {
      const frameId = data.frameId;
      // New “frame” (to be opened in its own iframe). Queue it up.
      const initiatorFrameId = data.initiatorFrameId;
      const siblingFrameEndIndex = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'frame-end' && context.state.frames[candidate.frameId].initiatorFrameId === initiatorFrameId) {
          return true;
        }
        return false;
      });
      const parentFrameEndIndex = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'frame-end' && context.state.frames[candidate.frameId].frameId === initiatorFrameId) {
          return true;
        }
        return false;
      });
      const exitIndex = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'exit') {
          return true;
        }
        return false;
      });
      const index = siblingFrameEndIndex === -1
        ? parentFrameEndIndex === -1
          ? exitIndex
          : parentFrameEndIndex + 1
        : siblingFrameEndIndex + 1;
      const lastSiblingChildrenIndex = context.state.children.findLastIndex((/** @type {any} */ candidate) => {
        return candidate.type === 'frame' && context.state.frames[candidate.frameId].initiatorFrameId === initiatorFrameId;
      });
      const parentTestChildrenIndex = context.state.children.findLastIndex((/** @type {any} */ candidate) => {
        return candidate.type === 'frame' && context.state.frames[candidate.frameId].frameId === initiatorFrameId;
      });
      const childrenIndex = lastSiblingChildrenIndex === -1
        ? parentTestChildrenIndex === -1
          ? context.state.children.length
          : parentTestChildrenIndex + 1
        : lastSiblingChildrenIndex + 1;
      const frameStartStepId = context.uuid();
      const framePlanStepId = context.uuid();
      const frameEndStepId = context.uuid();
      context.state.stepIds.splice(index, 0, frameStartStepId, framePlanStepId, frameEndStepId);
      context.state.steps[frameStartStepId] = { stepId: frameStartStepId, type: 'frame-start', frameId, status: 'waiting' };
      context.state.steps[framePlanStepId] = { stepId: framePlanStepId, type: 'frame-plan', frameId, status: 'waiting' };
      context.state.steps[frameEndStepId] = { stepId: frameEndStepId, type: 'frame-end', frameId, status: 'waiting' };
      context.state.frames[frameId] = { ...data, children: [] };
      context.state.children.splice(childrenIndex, 0, { type: 'frame', frameId });
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerSuiteStart(context, data) {
    if (!context.state.ended) {
      // New “suite-start” (to mark the start of a subtest). Queue it up.
      const stepId = context.uuid();
      const suiteId = data.suiteId;
      const index = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'frame-plan' && candidate.frameId === data.parents[0].frameId) {
          return true;
        }
        return false;
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'suite-start', suiteId: data.suiteId, status: 'waiting' };
      context.state.suites[suiteId] = { ...data, children: [] };
      if (data.parents.at(-1)?.type === 'suite') {
        context.state.suites[data.parents.at(-1).suiteId].children.push({ type: 'suite', suiteId });
      } else {
        context.state.frames[data.parents.at(-1).frameId].children.push({ type: 'suite', suiteId });
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerSuiteEnd(context, data) {
    if (!context.state.ended) {
      // Completed “suite-end” (to mark the end of a subtest). Queue it up.
      const planStepId = context.uuid();
      const endStepId = context.uuid();
      const suite = context.state.suites[data.suiteId];
      const index = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'frame-plan' && candidate.frameId === suite.parents[0].frameId) {
          return true;
        }
        return false;
      });
      context.state.stepIds.splice(index, 0, planStepId, endStepId);
      context.state.steps[planStepId] = { stepId: planStepId, type: 'suite-plan', suiteId: data.suiteId, status: 'waiting' };
      context.state.steps[endStepId] = { stepId: endStepId, type: 'suite-end', suiteId: data.suiteId, status: 'waiting' };
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerTest(context, data) {
    if (!context.state.ended) {
      // Apply name pattern filtering if present
      if (context.state.namePattern) {
        const fullTestName = XTestRoot.buildFullTestName(context, data);
        if (!context.state.namePattern.test(fullTestName)) {
          return; // Skip registration if pattern doesn't match
        }
      }

      // New “test” (to be run as part of a test suite). Queue it up.
      const stepId = context.uuid();
      const testId = data.testId;
      const index = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'frame-plan' && candidate.frameId === data.parents[0].frameId) {
          return true;
        }
        return false;
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'test', testId: data.testId, status: 'waiting' };
      context.state.tests[testId] = data;
      if (data.parents.at(-1)?.type === 'suite') {
        context.state.suites[data.parents.at(-1).suiteId].children.push({ type: 'test', testId });
      } else {
        context.state.frames[data.parents.at(-1).frameId].children.push({ type: 'test', testId });
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} test
   * @returns {string}
   */
  static buildFullTestName(context, test) {
    const parts = [];

    // Add parent suite names in order
    const suiteParents = test.parents.filter((/** @type {any} */ parent) => parent.type === 'suite');
    for (const parent of suiteParents) {
      const suite = context.state.suites[parent.suiteId];
      parts.push(suite.text);
    }

    // Add the test name itself
    parts.push(test.text);

    return parts.join(' ');
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onRegister(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      switch(data.type) {
        case 'frame':
          XTestRoot.registerFrame(context, data);
          break;
        case 'suite-start':
          XTestRoot.registerSuiteStart(context, data);
          break;
        case 'suite-end':
          XTestRoot.registerSuiteEnd(context, data);
          break;
        case 'test':
          XTestRoot.registerTest(context, data);
          break;
        default:
          throw new Error(`Unexpected registration type "${data.type}".`);
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onReady(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      // Ready means this iframe’s x-test is up — the load-phase race is moot.
      //  Flag the test so a late timeout / error / load doesn’t bail.
      const readyFrame = context.state.frames[data.frameId];
      if (readyFrame) {
        readyFrame.ready = true;
      }
      const only = (
        Object.values(context.state.tests).some((/** @type {any} */ candidate) => {
          return candidate.only && candidate.parents[0].frameId === data.frameId;
        }) ||
        Object.values(context.state.suites).some((/** @type {any} */ candidate) => {
          return candidate.only && candidate.parents[0].frameId === data.frameId;
        })
      );
      if (only) {
        for (const test of Object.values(context.state.tests)) {
          if (test.parents[0].frameId === data.frameId) {
            if (!test.only) {
              const suiteParents = test.parents
                .filter((/** @type {any} */ candidate) => candidate.type === 'suite')
                .map((/** @type {any} */ parent) => context.state.suites[parent.suiteId]);
              const hasOnlySuiteParent = suiteParents.some((/** @type {any} */ candidate) => candidate.only);
              if (!hasOnlySuiteParent) {
                test.directive = 'SKIP';
              } else if (!test.directive) {
                const lastSuiteParentWithDirective = suiteParents.findLast((/** @type {any} */ candidate) => !!candidate.directive);
                if (lastSuiteParentWithDirective) {
                  test.directive = lastSuiteParentWithDirective.directive;
                }
              }
            }
          }
        }
      } else {
        for (const test of Object.values(context.state.tests)) {
          if (test.parents[0].frameId === data.frameId) {
            if (!test.directive) {
              const suiteParents = test.parents
                .filter((/** @type {any} */ candidate) => candidate.type === 'suite')
                .map((/** @type {any} */ parent) => context.state.suites[parent.suiteId]);
              const lastSuiteParentWithDirective = suiteParents.findLast((/** @type {any} */ candidate) => !!candidate.directive);
              if (lastSuiteParentWithDirective) {
                test.directive = lastSuiteParentWithDirective.directive;
              }
            }
          }
        }
      }
      const stepId = context.state.stepIds.find((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        return candidate.type === 'frame-start' && candidate.frameId === data.frameId;
      });
      const step = context.state.steps[stepId];
      if (step.status !== 'running') {
        throw new Error('frame to ready is not running');
      }
      const href = XTestRoot.href(context, stepId);
      const level = XTestRoot.level(context, stepId);
      const tap = XTestTap.subtest(href, level);
      XTestRoot.output(context, stepId, tap);
      step.status = 'done';
    }
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onResult(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      const test = context.state.tests[data.testId];
      const stepId = context.state.stepIds.find((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        return candidate.type === 'test' && candidate.testId === test.testId;
      });
      const step = context.state.steps[stepId];
      if (step.status !== 'running') {
        throw new Error('step to complete is not running');
      }
      Object.assign(test, { ok: data.ok, error: data.error });
      step.status = 'done';
      const ok = XTestRoot.ok(context, stepId);
      const number = XTestRoot.number(context, stepId);
      const text = XTestRoot.text(context, stepId);
      const directive = XTestRoot.directive(context, stepId);
      const level = XTestRoot.level(context, stepId);
      const tap = XTestTap.testLine(ok, number, text, directive ?? undefined, level);
      if (!data.error) {
        XTestRoot.output(context, stepId, tap);
      } else {
         const yaml = XTestRoot.yaml(context, stepId);
         const errorTap = XTestTap.yaml(yaml.message, yaml.severity, yaml.data, level);
         XTestRoot.output(context, stepId, tap, errorTap);
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffVersion(context, stepId) {
    const tap = XTestTap.version();
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffSuiteStart(context, stepId) {
    const level = XTestRoot.level(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const tap = XTestTap.subtest(text, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffSuitePlan(context, stepId) {
    const level = XTestRoot.level(context, stepId);
    const count = XTestRoot.count(context, stepId);
    const tap = XTestTap.plan(count, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffSuiteEnd(context, stepId) {
    const number = XTestRoot.number(context, stepId);
    const ok = XTestRoot.ok(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive ?? undefined, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffFrameStart(context, stepId) {
    // Destroy prior frame. This keeps the final frame around for debugging.
    const lastIframe = document.querySelector('iframe');
    lastIframe?.remove();
    // Create the new frame.
    const step = context.state.steps[stepId];
    const href = XTestRoot.href(context, stepId);
    const iframe = document.createElement('iframe');
    const timeout = context.timeout(30_000);
    const iframeError = context.iframeError(iframe);
    const iframeLoad = context.iframeLoad(iframe);

    Promise.race([timeout, iframeError, iframeLoad]).then(result => {
      // Ready may have arrived before the iframe’s load/error event, in
      //  which case the iframe has already been removed and this race is
      //  stale — the pending timeout would otherwise fire ~30s later.
      //  Comment “ready” condition and load /demo/stale-race to reproduce.
      if (!context.state.ended && !context.state.frames[step.frameId]?.ready) {
        switch (result) {
          case XTestCommon.TIMEOUT:
            XTestRoot.bail(context, new Error(`Timed out loading ${href}`));
            break;
          case XTestCommon.IFRAME_ERROR:
            XTestRoot.bail(context, new Error(`Failed to load ${href}`));
            break;
          case XTestCommon.IFRAME_LOAD:
            // To ensure the child frame is given adequate time to register
            //  after being loaded, we wait for a message in the queue to be
            //  processed before giving up. See handler for more detail.
            context.publish('x-test-root-defer', { type: 'check-initialized', frameId: step.frameId, href });
            break;
        }
      }
    });

    iframe.setAttribute('data-x-test-frame-id', step.frameId);
    Object.assign(iframe, { src: href });
    Object.assign(iframe.style, {
      border: 'none', backgroundColor: 'white', height: '100vh',
      width: '100vw', position: 'fixed', zIndex: '0', top: '0', left: '0',
    });
    document.body.append(iframe);
    step.status = 'running';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffFramePlan(context, stepId) {
    const count = XTestRoot.count(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.plan(count, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffFrameEnd(context, stepId) {
    const number = XTestRoot.number(context, stepId);
    const ok = XTestRoot.ok(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive ?? undefined, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffTest(context, stepId) {
    const step = context.state.steps[stepId];
    const { testId, directive, interval } = context.state.tests[step.testId];
    context.publish('x-test-root-run', { testId, directive, interval });
    step.status = 'running';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffExit(context, stepId) {
    const count = XTestRoot.count(context, stepId);
    const planTap = XTestTap.plan(count);
    XTestRoot.output(context, stepId, planTap);
    context.state.steps[stepId].status = 'done';
    XTestRoot.end(context);
  }

  /**
   * @param {any} context
   */
  static check(context) {
    if (!context.state.ended) {
      // Look to see if any tests are running.
      const runningStepId = context.state.stepIds.find((/** @type {any} */ candidateId) => {
        return context.state.steps[candidateId].status === 'running';
      });
      if (!runningStepId) {
        // If nothing’s running, find the first step that’s waiting and run that.
        const stepId = context.state.stepIds.find((/** @type {any} */ candidateId) => {
          return context.state.steps[candidateId].status === 'waiting';
        });
        if (stepId) {
          const waitingStep = context.state.steps[stepId];
          switch (waitingStep.type) {
            case 'version':
              XTestRoot.kickoffVersion(context, stepId);
              XTestRoot.check(context);
              break;
            case 'suite-start':
              XTestRoot.kickoffSuiteStart(context, stepId);
              XTestRoot.check(context);
              break;
            case 'suite-plan':
              XTestRoot.kickoffSuitePlan(context, stepId);
              XTestRoot.check(context);
              break;
            case 'suite-end':
              XTestRoot.kickoffSuiteEnd(context, stepId);
              XTestRoot.check(context);
              break;
            case 'frame-start':
              XTestRoot.kickoffFrameStart(context, stepId);
              XTestRoot.check(context);
              break;
            case 'frame-plan':
              XTestRoot.kickoffFramePlan(context, stepId);
              XTestRoot.check(context);
              break;
            case 'frame-end':
              XTestRoot.kickoffFrameEnd(context, stepId);
              XTestRoot.check(context);
              break;
            case 'test':
              XTestRoot.kickoffTest(context, stepId);
              XTestRoot.check(context);
              break;
            case 'exit':
              XTestRoot.kickoffExit(context, stepId);
              break;
            default:
              throw new Error(`Unexpected step type "${waitingStep.type}".`);
          }
        }
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} error
   * @param {any} [options]
   */
  static bail(context, error, options) {
    if (!context.state.ended) {
      // Flush any queued output when bailing if filtering is active
      if (context.state.filtering && context.state.queue.length > 0) {
        XTestRoot.log(context, ...context.state.queue);
        context.state.queue.length = 0;
        context.state.queueing = false;
      }
      if (error && error.stack) {
        XTestRoot.log(context, XTestTap.diagnostic(error.stack));
      }
      if (options?.frameId) {
        const frame = context.state.frames[options.frameId];
        frame.error = error;
        const href = frame.href;
        XTestRoot.log(context, XTestTap.bailOut(href));
      } else {
        XTestRoot.log(context, XTestTap.bailOut());
      }
      XTestRoot.end(context);
    }
  }

  /**
   * @param {any} context
   * @param {...any} tap
   */
  static log(context, ...tap) {
    for (const line of tap) {
      console.log(line); // eslint-disable-line no-console
    }
    context.state.reporter?.tap(...tap);
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @param {...any} stepTap
   */
  static output(context, stepId, ...stepTap) {
    const lastIndex = context.state.stepIds.findIndex((/** @type {any} */ candidateId) => {
      const candidate = context.state.steps[candidateId];
      return !candidate.tap;
    });
    context.state.steps[stepId].tap = stepTap;
    const index = context.state.stepIds.findIndex((/** @type {any} */ candidateId) => {
      const candidate = context.state.steps[candidateId];
      return !candidate.tap;
    });
    if (lastIndex !== index) {
      let tap;
      if (index === -1) {
        // We’re done!
        tap = context.state.stepIds.slice(lastIndex).map((/** @type {any} */ targetId) => context.state.steps[targetId].tap);
      } else {
        tap = context.state.stepIds.slice(lastIndex, index).map((/** @type {any} */ targetId) => context.state.steps[targetId].tap);
      }
      if (context.state.filtering) {
        XTestRoot.handleFilteredOutput(context, tap.flat(), stepId);
      } else {
        XTestRoot.log(context, ...tap.flat());
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} tap
   * @param {any} stepId
   */
  static handleFilteredOutput(context, tap, stepId) {
    const step = context.state.steps[stepId];

    switch (step.type) {
      case 'suite-start':
      case 'frame-start':
        context.state.queueing = true;
        XTestRoot.queueOrOutput(context, tap, step.type);
        break;
      case 'suite-plan':
      case 'frame-plan':
        if (XTestRoot.count(context, stepId) === 0) {
          XTestRoot.handleEmptyPlan(context);
        } else {
          XTestRoot.queueOrOutput(context, tap, step.type);
        }
        break;
      case 'suite-end':
        if (!XTestRoot.handleEmptySuite(context, step)) {
          XTestRoot.queueOrOutput(context, tap, step.type);
        }
        break;
      case 'frame-end':
        if (!XTestRoot.handleEmptyFrame(context, step)) {
          XTestRoot.queueOrOutput(context, tap, step.type);
        }
        break;
      case 'version':
        XTestRoot.log(context, ...tap);
        break;
      case 'exit':
        XTestRoot.handleExit(context, tap);
        break;
      case 'test':
        XTestRoot.queueOrOutput(context, tap, step.type);
        break;
      default:
        throw new Error(`Unexpected step type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @returns {void}
   */
  static handleEmptyPlan(context) {
    // Find the matching subtest line in the queue and remove everything from there
    const subtestIndex = context.state.queue.findLastIndex((/** @type {any} */ line) =>
      line.trim().startsWith('# Subtest:')
    );
    if (subtestIndex === -1) {
      throw new Error('Expected to find matching subtest in queue for empty plan');
    }
    context.state.queue.length = subtestIndex;
  }

  /**
   * @param {any} context
   * @param {any} step
   * @returns {boolean}
   */
  static handleEmptySuite(context, step) {
    const suite = context.state.suites[step.suiteId];
    if (suite.children.length === 0) {
      XTestRoot.removeFromParent(suite.parents, 'suite', step.suiteId, context);
      return true;
    }
    return false;
  }

  /**
   * @param {any} context
   * @param {any} step
   * @returns {boolean}
   */
  static handleEmptyFrame(context, step) {
    const frame = context.state.frames[step.frameId];
    if (frame.children.length === 0) {
      const childIndex = context.state.children.findIndex((/** @type {any} */ child) =>
        child.type === 'frame' && child.frameId === frame.frameId
      );
      if (childIndex !== -1) {
        context.state.children.splice(childIndex, 1);
      }
      return true;
    }
    return false;
  }

  /**
   * @param {any} context
   * @param {any} tap
   * @returns {void}
   */
  static handleExit(context, tap) {
    if (context.state.queue.length > 0) {
      XTestRoot.log(context, ...context.state.queue);
      context.state.queue.length = 0;
      context.state.queueing = false;
    }
    XTestRoot.log(context, ...tap);
  }

  /**
   * @param {any} parents
   * @param {any} childType
   * @param {any} childId
   * @param {any} context
   * @returns {void}
   */
  static removeFromParent(parents, childType, childId, context) {
    const parentType = parents.at(-1)?.type;
    if (parentType === 'suite') {
      const parentSuite = context.state.suites[parents.at(-1).suiteId];
      const childIndex = parentSuite.children.findIndex((/** @type {any} */ child) =>
        child.type === childType && child[`${childType}Id`] === childId
      );
      if (childIndex !== -1) {
        parentSuite.children.splice(childIndex, 1);
      }
    } else if (parentType === 'frame') {
      const parentFrame = context.state.frames[parents.at(-1).frameId];
      const childIndex = parentFrame.children.findIndex((/** @type {any} */ child) =>
        child.type === childType && child[`${childType}Id`] === childId
      );
      if (childIndex !== -1) {
        parentFrame.children.splice(childIndex, 1);
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} tap
   * @param {any} stepType
   * @returns {void}
   */
  static queueOrOutput(context, tap, stepType) {
    if (context.state.queueing) {
      context.state.queue.push(...tap);

      // Flush queue and stop queueing for end steps
      if (stepType === 'test' || stepType === 'suite-end' || stepType === 'frame-end') {
        context.state.queueing = false;
        XTestRoot.log(context, ...context.state.queue);
        context.state.queue.length = 0;
      }
    } else {
      XTestRoot.log(context, ...tap);
    }
  }

  /**
   * @param {any} context
   * @param {any} child
   * @param {any} [options]
   * @returns {boolean}
   */
  static childOk(context, child, options) {
    switch (child.type) {
      case 'frame':
        return context.state.frames[child.frameId].children.every((/** @type {any} */ candidate) => XTestRoot.childOk(context, candidate, options));
      case 'suite':
        return context.state.suites[child.suiteId].children.every((/** @type {any} */ candidate) => XTestRoot.childOk(context, candidate, options));
      case 'test':
        return context.state.tests[child.testId].ok || options?.todoOk && context.state.tests[child.testId].directive === 'TODO';
      default:
        throw new Error(`Unexpected type "${child.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {boolean}
   */
  static ok(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'frame-end':
        return XTestRoot.childOk(context, { type: 'frame', frameId: step.frameId }, { todoOk: true });
      case 'suite-end':
        return XTestRoot.childOk(context, { type: 'suite', suiteId: step.suiteId }, { todoOk: true });
      case 'test':
        return XTestRoot.childOk(context, { type: 'test', testId: step.testId });
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {number}
   */
  static number(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test': {
        const test = context.state.tests[step.testId];
        const parentChildren = test.parents.at(-1)?.type === 'suite'
          ? context.state.suites[test.parents.at(-1).suiteId].children
          : context.state.frames[test.parents.at(-1).frameId].children;
        const index = parentChildren.findIndex((/** @type {any} */ candidate) => candidate.testId === test.testId);
        return index + 1;
      }
      case 'suite-end': {
        const suite = context.state.suites[step.suiteId];
        const parentChildren = suite.parents.at(-1)?.type === 'suite'
          ? context.state.suites[suite.parents.at(-1).suiteId].children
          : context.state.frames[suite.parents.at(-1).frameId].children;
        const index = parentChildren.findIndex((/** @type {any} */ candidate) => candidate.suiteId === suite.suiteId);
        return index + 1;
      }
      case 'frame-end': {
        const frame = context.state.frames[step.frameId];
        const index = context.state.children.findIndex((/** @type {any} */ candidate) => candidate.frameId === frame.frameId);
        return index + 1;
      }
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {string}
   */
  static text(context, stepId) {
    // The regex-replace prevents usage of the special `#` character which is
    //  meaningful in TAP. It’s overly-conservative now — it could be less
    //  restrictive in the future.
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'frame-end':
        return context.state.frames[step.frameId].href;
      case 'suite-start':
      case 'suite-end':
        return context.state.suites[step.suiteId].text.replace(/#/g, '*');
      case 'test':
        return context.state.tests[step.testId].text.replace(/#/g, '*');
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {string}
   */
  static href(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'frame-start':
      case 'frame-end':
        return context.state.frames[step.frameId].href;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {string | null}
   */
  static directive(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'suite-end':
      case 'frame-end':
        return null;
      case 'test':
        return context.state.tests[step.testId].directive;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {number}
   */
  static level(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'frame-plan':
        return 1;
      case 'frame-start':
      case 'frame-end':
        return 0;
      case 'suite-plan':
        return context.state.suites[step.suiteId].parents.length + 1;
      case 'suite-start':
      case 'suite-end':
        return context.state.suites[step.suiteId].parents.length;
      case 'test':
        return context.state.tests[step.testId].parents.length;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {number}
   */
  static count(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'frame-plan':
        return context.state.frames[step.frameId].children.length;
      case 'suite-plan':
        return context.state.suites[step.suiteId].children.length;
      case 'exit':
        return context.state.children.length;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {{message: string, severity: string, data: Record<string, any>}}
   */
  static yaml(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test': {
        const test = context.state.tests[step.testId];
        const { ok, directive, error } = test;
        const yaml = { message: 'ok', severity: 'comment', data: /** @type {Record<string, any>} */ ({}) };
        if (ok) {
          if (directive === 'SKIP') {
            yaml.message = 'skip';
          } else if (directive === 'TODO') {
            yaml.message = 'todo';
          }
        } else {
          if (directive === 'TODO') {
            yaml.message = error && error.message ? error.message : 'todo';
            yaml.severity = 'todo';
          } else {
            yaml.message = error && error.message ? error.message : 'fail';
            yaml.severity = 'fail';
          }
          if (error && error.stack) {
            yaml.data.stack = error.stack;
          }
        }
        return yaml;
      }
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  /**
   * @param {any} context
   */
  static end(context) {
    context.state.ended = true;
  }
}
