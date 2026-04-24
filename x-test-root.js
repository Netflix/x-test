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
        case 'x-test-suite-register':
          XTestRoot.onRegister(context, event);
          break;
        case 'x-test-suite-initialize':
          XTestRoot.onInitialize(context, event);
          break;
        case 'x-test-suite-ready':
          XTestRoot.onReady(context, event);
          break;
        case 'x-test-suite-result':
          XTestRoot.onResult(context, event);
          break;
        case 'x-test-suite-bail':
          XTestRoot.onBail(context, event);
          break;
      }
      XTestRoot.check(context);
    });

    // Run own tests in iframe.
    context.publish('x-test-suite-register', { type: 'test', testId: context.uuid(), href: url.href });
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onBail(context, event) {
    if (!context.state.ended) {
      XTestRoot.bail(context, event.data.data.error, { testId: event.data.data.testId });
    }
  }

  /**
   * @param {any} context
   * @param {any} event
   */
  static onInitialize(context, event) {
    if (!context.state.ended) {
      const testId = event.data.data.testId;
      const test = context.state.tests[testId];
      test.initialized = true;
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
      const test = context.state.tests[data.testId];
      if (!test.initialized) {
        XTestRoot.bail(context, new Error(`Failed to initialize ${data.href}`));
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerTest(context, data) {
    if (!context.state.ended) {
      const testId = data.testId;
      // New "test" (to be opened in its own iframe). Queue it up.
      const initiatorTestId = data.initiatorTestId;
      const siblingTestEndIndex = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-end' && context.state.tests[candidate.testId].initiatorTestId === initiatorTestId) {
          return true;
        }
        return false;
      });
      const parentTestEndIndex = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-end' && context.state.tests[candidate.testId].testId === initiatorTestId) {
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
      const index = siblingTestEndIndex === -1
        ? parentTestEndIndex === -1
          ? exitIndex
          : parentTestEndIndex + 1
        : siblingTestEndIndex + 1;
      const lastSiblingChildrenIndex = context.state.children.findLastIndex((/** @type {any} */ candidate) => {
        return candidate.type === 'test' && context.state.tests[candidate.testId].initiatorTestId === initiatorTestId;
      });
      const parentTestChildrenIndex = context.state.children.findLastIndex((/** @type {any} */ candidate) => {
        return candidate.type === 'test' && context.state.tests[candidate.testId].testId === initiatorTestId;
      });
      const childrenIndex = lastSiblingChildrenIndex === -1
        ? parentTestChildrenIndex === -1
          ? context.state.children.length
          : parentTestChildrenIndex + 1
        : lastSiblingChildrenIndex + 1;
      const testStartStepId = context.uuid();
      const testPlanStepId = context.uuid();
      const testEndStepId = context.uuid();
      context.state.stepIds.splice(index, 0, testStartStepId, testPlanStepId, testEndStepId);
      context.state.steps[testStartStepId] = { stepId: testStartStepId, type: 'test-start', testId, status: 'waiting' };
      context.state.steps[testPlanStepId] = { stepId: testPlanStepId, type: 'test-plan', testId, status: 'waiting' };
      context.state.steps[testEndStepId] = { stepId: testEndStepId, type: 'test-end', testId, status: 'waiting' };
      context.state.tests[testId] = { ...data, children: [] };
      context.state.children.splice(childrenIndex, 0, { type: 'test', testId });
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerDescribeStart(context, data) {
    if (!context.state.ended) {
      // New "describe-start" (to mark the start of a subtest). Queue it up.
      const stepId = context.uuid();
      const describeId = data.describeId;
      const index = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === data.parents[0].testId) {
          return true;
        }
        return false;
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'describe-start', describeId: data.describeId, status: 'waiting' };
      context.state.describes[describeId] = { ...data, children: [] };
      if (data.parents.at(-1)?.type === 'describe') {
        context.state.describes[data.parents.at(-1).describeId].children.push({ type: 'describe', describeId });
      } else {
        context.state.tests[data.parents.at(-1).testId].children.push({ type: 'describe', describeId });
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerDescribeEnd(context, data) {
    if (!context.state.ended) {
      // Completed "describe-end" (to mark the end of a subtest). Queue it up.
      const planStepId = context.uuid();
      const endStepId = context.uuid();
      const describe = context.state.describes[data.describeId];
      const index = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === describe.parents[0].testId) {
          return true;
        }
        return false;
      });
      context.state.stepIds.splice(index, 0, planStepId, endStepId);
      context.state.steps[planStepId] = { stepId: planStepId, type: 'describe-plan', describeId: data.describeId, status: 'waiting' };
      context.state.steps[endStepId] = { stepId: endStepId, type: 'describe-end', describeId: data.describeId, status: 'waiting' };
    }
  }

  /**
   * @param {any} context
   * @param {any} data
   */
  static registerIt(context, data) {
    if (!context.state.ended) {
      // Apply name pattern filtering if present
      if (context.state.namePattern) {
        const fullTestName = XTestRoot.buildFullTestName(context, data);
        if (!context.state.namePattern.test(fullTestName)) {
          return; // Skip registration if pattern doesn't match
        }
      }

      // New "it" (to be run as part of a test suite). Queue it up.
      const stepId = context.uuid();
      const itId = data.itId;
      const index = context.state.stepIds.findLastIndex((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === data.parents[0].testId) {
          return true;
        }
        return false;
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'it', itId: data.itId, status: 'waiting' };
      context.state.its[itId] = data;
      if (data.parents.at(-1)?.type === 'describe') {
        context.state.describes[data.parents.at(-1).describeId].children.push({ type: 'it', itId });
      } else {
        context.state.tests[data.parents.at(-1).testId].children.push({ type: 'it', itId });
      }
    }
  }

  /**
   * @param {any} context
   * @param {any} it
   * @returns {string}
   */
  static buildFullTestName(context, it) {
    const parts = [];

    // Add parent describe names in order
    const describeParents = it.parents.filter((/** @type {any} */ parent) => parent.type === 'describe');
    for (const parent of describeParents) {
      const describe = context.state.describes[parent.describeId];
      parts.push(describe.text);
    }

    // Add the test name itself
    parts.push(it.text);

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
        case 'test':
          XTestRoot.registerTest(context, data);
          break;
        case 'describe-start':
          XTestRoot.registerDescribeStart(context, data);
          break;
        case 'describe-end':
          XTestRoot.registerDescribeEnd(context, data);
          break;
        case 'it':
          XTestRoot.registerIt(context, data);
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
      const readyTest = context.state.tests[data.testId];
      if (readyTest) {
        readyTest.ready = true;
      }
      const only = (
        Object.values(context.state.its).some((/** @type {any} */ candidate) => {
          return candidate.only && candidate.parents[0].testId === data.testId;
        }) ||
        Object.values(context.state.describes).some((/** @type {any} */ candidate) => {
          return candidate.only && candidate.parents[0].testId === data.testId;
        })
      );
      if (only) {
        for (const it of Object.values(context.state.its)) {
          if (it.parents[0].testId === data.testId) {
            if (!it.only) {
              const describeParents = it.parents
                .filter((/** @type {any} */ candidate) => candidate.type === 'describe')
                .map((/** @type {any} */ parent) => context.state.describes[parent.describeId]);
              const hasOnlyDescribeParent = describeParents.some((/** @type {any} */ candidate) => candidate.only);
              if (!hasOnlyDescribeParent) {
                it.directive = 'SKIP';
              } else if (!it.directive) {
                const lastDescribeParentWithDirective = describeParents.findLast((/** @type {any} */ candidate) => !!candidate.directive);
                if (lastDescribeParentWithDirective) {
                  it.directive = lastDescribeParentWithDirective.directive;
                }
              }
            }
          }
        }
      } else {
        for (const it of Object.values(context.state.its)) {
          if (it.parents[0].testId === data.testId) {
            if (!it.directive) {
              const describeParents = it.parents
                .filter((/** @type {any} */ candidate) => candidate.type === 'describe')
                .map((/** @type {any} */ parent) => context.state.describes[parent.describeId]);
              const lastDescribeParentWithDirective = describeParents.findLast((/** @type {any} */ candidate) => !!candidate.directive);
              if (lastDescribeParentWithDirective) {
                it.directive = lastDescribeParentWithDirective.directive;
              }
            }
          }
        }
      }
      const stepId = context.state.stepIds.find((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        return candidate.type === 'test-start' && candidate.testId === data.testId;
      });
      const step = context.state.steps[stepId];
      if (step.status !== 'running') {
        throw new Error('test to ready is not running');
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
      const it = context.state.its[data.itId];
      const stepId = context.state.stepIds.find((/** @type {any} */ candidateId) => {
        const candidate = context.state.steps[candidateId];
        return candidate.type === 'it' && candidate.itId === it.itId;
      });
      const step = context.state.steps[stepId];
      if (step.status !== 'running') {
        throw new Error('step to complete is not running');
      }
      Object.assign(it, { ok: data.ok, error: data.error });
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
  static kickoffDescribeStart(context, stepId) {
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
  static kickoffDescribePlan(context, stepId) {
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
  static kickoffDescribeEnd(context, stepId) {
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
  static kickoffTestStart(context, stepId) {
    // Destroy prior test. This keeps the final test around for debugging.
    const lastIframe = document.querySelector('iframe');
    lastIframe?.remove();
    // Create the new test.
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
      if (!context.state.ended && !context.state.tests[step.testId]?.ready) {
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
            context.publish('x-test-root-defer', { type: 'check-initialized', testId: step.testId, href });
            break;
        }
      }
    });

    iframe.setAttribute('data-x-test-test-id', step.testId);
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
  static kickoffTestPlan(context, stepId) {
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
  static kickoffTestEnd(context, stepId) {
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
  static kickoffIt(context, stepId) {
    const step = context.state.steps[stepId];
    const { itId, directive, interval } = context.state.its[step.itId];
    context.publish('x-test-root-run', { itId, directive, interval });
    step.status = 'running';
  }

  /**
   * @param {any} context
   * @param {any} stepId
   */
  static kickoffExit(context, stepId) {
    const count = XTestRoot.count(context, stepId);
    const planTap = XTestTap.plan(count);
    const failureTap = [];
    const failureStepIds = XTestRoot.collectFailureStepIds(context);
    if (failureStepIds.length > 0) {
      failureTap.push(XTestTap.diagnostic('Failures:'));
      for (const failureStepId of failureStepIds) {
        failureTap.push(XTestTap.diagnostic(''));
        for (const line of XTestRoot.formatFailure(context, failureStepId).split('\n')) {
          failureTap.push(XTestTap.diagnostic(line));
        }
      }
    }
    XTestRoot.output(context, stepId, ...failureTap, planTap);
    context.state.steps[stepId].status = 'done';
    XTestRoot.end(context);
  }

  /**
   * @param {any} context
   * @returns {string[]}
   */
  static collectFailureStepIds(context) {
    const failureStepIds = [];
    for (const stepId of context.state.stepIds) {
      const step = context.state.steps[stepId];
      if (step.type === 'it') {
        const it = context.state.its[step.itId];
        if (it.ok === false && it.directive !== 'TODO') {
          failureStepIds.push(stepId);
        }
      }
    }
    return failureStepIds;
  }

  /**
   * @param {any} context
   * @param {any} stepId
   * @returns {string}
   */
  static formatFailure(context, stepId) {
    const step = context.state.steps[stepId];
    const it = context.state.its[step.itId];
    const test = context.state.tests[it.parents[0].testId];
    const lines = [test.href];
    const describeParents = it.parents.filter((/** @type {any} */ parent) => parent.type === 'describe');
    for (const parent of describeParents) {
      lines.push(`> ${context.state.describes[parent.describeId].text.replace(/#/g, '*')}`);
    }
    lines.push(`> ${it.text.replace(/#/g, '*')}`);
    if (it.error.stack) {
      for (const stackLine of it.error.stack.split('\n')) {
        lines.push(stackLine);
      }
    } else {
      lines.push(`Error: ${it.error.message}`);
    }
    return lines.join('\n');
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
        // If nothing's running, find the first step that's waiting and run that.
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
            case 'describe-start':
              XTestRoot.kickoffDescribeStart(context, stepId);
              XTestRoot.check(context);
              break;
            case 'describe-plan':
              XTestRoot.kickoffDescribePlan(context, stepId);
              XTestRoot.check(context);
              break;
            case 'describe-end':
              XTestRoot.kickoffDescribeEnd(context, stepId);
              XTestRoot.check(context);
              break;
            case 'test-start':
              XTestRoot.kickoffTestStart(context, stepId);
              XTestRoot.check(context);
              break;
            case 'test-plan':
              XTestRoot.kickoffTestPlan(context, stepId);
              XTestRoot.check(context);
              break;
            case 'test-end':
              XTestRoot.kickoffTestEnd(context, stepId);
              XTestRoot.check(context);
              break;
            case 'it':
              XTestRoot.kickoffIt(context, stepId);
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
      if (options?.testId) {
        const test = context.state.tests[options.testId];
        test.error = error;
        const href = test.href;
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
        // We're done!
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
      case 'describe-start':
      case 'test-start':
        context.state.queueing = true;
        XTestRoot.queueOrOutput(context, tap, step.type);
        break;
      case 'describe-plan':
      case 'test-plan':
        if (XTestRoot.count(context, stepId) === 0) {
          XTestRoot.handleEmptyPlan(context);
        } else {
          XTestRoot.queueOrOutput(context, tap, step.type);
        }
        break;
      case 'describe-end':
        if (!XTestRoot.handleEmptyDescribe(context, step)) {
          XTestRoot.queueOrOutput(context, tap, step.type);
        }
        break;
      case 'test-end':
        if (!XTestRoot.handleEmptyTest(context, step)) {
          XTestRoot.queueOrOutput(context, tap, step.type);
        }
        break;
      case 'version':
        XTestRoot.log(context, ...tap);
        break;
      case 'exit':
        XTestRoot.handleExit(context, tap);
        break;
      case 'it':
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
  static handleEmptyDescribe(context, step) {
    const describe = context.state.describes[step.describeId];
    if (describe.children.length === 0) {
      XTestRoot.removeFromParent(describe.parents, 'describe', step.describeId, context);
      return true;
    }
    return false;
  }

  /**
   * @param {any} context
   * @param {any} step
   * @returns {boolean}
   */
  static handleEmptyTest(context, step) {
    const test = context.state.tests[step.testId];
    if (test.children.length === 0) {
      const childIndex = context.state.children.findIndex((/** @type {any} */ child) =>
        child.type === 'test' && child.testId === test.testId
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
    if (parentType === 'describe') {
      const parentDescribe = context.state.describes[parents.at(-1).describeId];
      const childIndex = parentDescribe.children.findIndex((/** @type {any} */ child) =>
        child.type === childType && child[`${childType}Id`] === childId
      );
      if (childIndex !== -1) {
        parentDescribe.children.splice(childIndex, 1);
      }
    } else if (parentType === 'test') {
      const parentTest = context.state.tests[parents.at(-1).testId];
      const childIndex = parentTest.children.findIndex((/** @type {any} */ child) =>
        child.type === childType && child[`${childType}Id`] === childId
      );
      if (childIndex !== -1) {
        parentTest.children.splice(childIndex, 1);
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
      if (stepType === 'it' || stepType === 'describe-end' || stepType === 'test-end') {
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
      case 'test':
        return context.state.tests[child.testId].children.every((/** @type {any} */ candidate) => XTestRoot.childOk(context, candidate, options));
      case 'describe':
        return context.state.describes[child.describeId].children.every((/** @type {any} */ candidate) => XTestRoot.childOk(context, candidate, options));
      case 'it':
        return context.state.its[child.itId].ok || options?.todoOk && context.state.its[child.itId].directive === 'TODO';
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
      case 'test-end':
        return XTestRoot.childOk(context, { type: 'test', testId: step.testId }, { todoOk: true });
      case 'describe-end':
        return XTestRoot.childOk(context, { type: 'describe', describeId: step.describeId }, { todoOk: true });
      case 'it':
        return XTestRoot.childOk(context, { type: 'it', itId: step.itId });
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
      case 'it': {
        const it = context.state.its[step.itId];
        const parentChildren = it.parents.at(-1)?.type === 'describe'
          ? context.state.describes[it.parents.at(-1).describeId].children
          : context.state.tests[it.parents.at(-1).testId].children;
        const index = parentChildren.findIndex((/** @type {any} */ candidate) => candidate.itId === it.itId);
        return index + 1;
      }
      case 'describe-end': {
        const describe = context.state.describes[step.describeId];
        const parentChildren = describe.parents.at(-1)?.type === 'describe'
          ? context.state.describes[describe.parents.at(-1).describeId].children
          : context.state.tests[describe.parents.at(-1).testId].children;
        const index = parentChildren.findIndex((/** @type {any} */ candidate) => candidate.describeId === describe.describeId);
        return index + 1;
      }
      case 'test-end': {
        const test = context.state.tests[step.testId];
        const index = context.state.children.findIndex((/** @type {any} */ candidate) => candidate.testId === test.testId);
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
    //  meaningful in TAP. It's overly-conservative now — it could be less
    //  restrictive in the future.
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-end':
        return context.state.tests[step.testId].href;
      case 'describe-start':
      case 'describe-end':
        return context.state.describes[step.describeId].text.replace(/#/g, '*');
      case 'it':
        return context.state.its[step.itId].text.replace(/#/g, '*');
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
      case 'test-start':
      case 'test-end':
        return context.state.tests[step.testId].href;
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
      case 'describe-end':
      case 'test-end':
        return null;
      case 'it':
        return context.state.its[step.itId].directive;
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
      case 'test-plan':
        return 1;
      case 'test-start':
      case 'test-end':
        return 0;
      case 'describe-plan':
        return context.state.describes[step.describeId].parents.length + 1;
      case 'describe-start':
      case 'describe-end':
        return context.state.describes[step.describeId].parents.length;
      case 'it':
        return context.state.its[step.itId].parents.length;
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
      case 'test-plan':
        return context.state.tests[step.testId].children.length;
      case 'describe-plan':
        return context.state.describes[step.describeId].children.length;
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
      case 'it': {
        const it = context.state.its[step.itId];
        const { ok, directive, error } = it;
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
