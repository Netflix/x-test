import { XTestReporter } from './x-test-reporter.js';
import { XTestTap } from './x-test-tap.js';

export class XTestRoot {
  static initialize(context, href) {
    const url = new URL(href);
    if (!url.searchParams.get('x-test-no-reporter')) {
      context.state.reporter = new XTestReporter();
      document.body.append(context.state.reporter);
    }
    context.state.coverage = url.searchParams.get('x-test-run-coverage') === '';
    const nameParam = url.searchParams.get('x-test-name');
    context.state.filtering = !!nameParam;
    context.state.namePattern = nameParam ? new RegExp(nameParam) : null;
    context.state.coverageValuePromise = new Promise(resolve => {
      context.state.resolveCoverageValuePromise = value => {
        context.state.coverageValue = value;
        resolve(context.state.coverageValue);
      };
    });
    const versionStepId = context.uuid();
    const exitStepId = context.uuid();
    context.state.stepIds.push(versionStepId, exitStepId);
    context.state.steps[versionStepId] = { stepId: versionStepId, type: 'version', status: 'waiting' };
    context.state.steps[exitStepId] = { stepId: exitStepId, type: 'exit', status: 'waiting' };
    context.subscribe(event => {
      switch (event.data.type) {
        case 'x-test-client-ping':
          XTestRoot.onPing(context, event);
          break;
        case 'x-test-client-coverage-result':
          XTestRoot.onCoverageResult(context, event);
          break;
        case 'x-test-suite-register':
          XTestRoot.onRegister(context, event);
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
    url.searchParams.delete('x-test-no-reporter');
    url.searchParams.delete('x-test-run-coverage');
    context.publish('x-test-suite-register', { type: 'test', testId: context.uuid(), href: url.href });
  }

  static onPing(context/*, event*/) {
    context.publish('x-test-root-pong', { ended: context.state.ended, waiting: context.state.waiting });
  }

  static onBail(context, event) {
    if (!context.state.ended) {
      XTestRoot.bail(context, event.data.data.error, { testId: event.data.data.testId });
    }
  }

  static registerTest(context, data) {
    if (!context.state.ended) {
      const testId = data.testId;
      // New "test" (to be opened in its own iframe). Queue it up.
      const initiatorTestId = data.initiatorTestId;
      const siblingTestEndIndex = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-end' && context.state.tests[candidate.testId].initiatorTestId === initiatorTestId) {
          return true;
        }
      });
      const parentTestEndIndex = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-end' && context.state.tests[candidate.testId].testId === initiatorTestId) {
          return true;
        }
      });
      const coverageIndex = context.state.stepIds.findIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'coverage') {
          return true;
        }
      });
      const exitIndex = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'exit') {
          return true;
        }
      });
      const index = siblingTestEndIndex === -1
        ? parentTestEndIndex === -1
          ? coverageIndex === -1
            ? exitIndex
            : coverageIndex
          : parentTestEndIndex + 1
        : siblingTestEndIndex + 1;
      const lastSiblingChildrenIndex = context.state.children.findLastIndex(candidate => {
        return candidate.type === 'test' && context.state.tests[candidate.testId].initiatorTestId === initiatorTestId;
      });
      const parentTestChildrenIndex = context.state.children.findLastIndex(candidate => {
        return candidate.type === 'test' && context.state.tests[candidate.testId].testId === initiatorTestId;
      });
      const firstCoverageChildrenIndex = context.state.children.findIndex(candidate => {
        return candidate.type === 'coverage';
      });
      const childrenIndex = lastSiblingChildrenIndex === -1
        ? parentTestChildrenIndex === -1
          ? firstCoverageChildrenIndex === -1
            ? context.state.children.length
            : firstCoverageChildrenIndex
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

  static registerDescribeStart(context, data) {
    if (!context.state.ended) {
      // New "describe-start" (to mark the start of a subtest). Queue it up.
      const stepId = context.uuid();
      const describeId = data.describeId;
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === data.parents[0].testId) {
          return true;
        }
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

  static registerDescribeEnd(context, data) {
    if (!context.state.ended) {
      // Completed "describe-end" (to mark the end of a subtest). Queue it up.
      const planStepId = context.uuid();
      const endStepId = context.uuid();
      const describe = context.state.describes[data.describeId];
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === describe.parents[0].testId) {
          return true;
        }
      });
      context.state.stepIds.splice(index, 0, planStepId, endStepId);
      context.state.steps[planStepId] = { stepId: planStepId, type: 'describe-plan', describeId: data.describeId, status: 'waiting' };
      context.state.steps[endStepId] = { stepId: endStepId, type: 'describe-end', describeId: data.describeId, status: 'waiting' };
    }
  }

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
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'test-plan' && candidate.testId === data.parents[0].testId) {
          return true;
        }
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

  static buildFullTestName(context, it) {
    const parts = [];
    
    // Add parent describe names in order
    const describeParents = it.parents.filter(parent => parent.type === 'describe');
    for (const parent of describeParents) {
      const describe = context.state.describes[parent.describeId];
      parts.push(describe.text);
    }
    
    // Add the test name itself
    parts.push(it.text);
    
    return parts.join(' ');
  }

  static registerCoverage(context, data) {
    if (!context.state.ended) {
      // New "coverage" goal. Queue it up.
      const stepId = context.uuid();
      const coverageId = data.coverageId;
      const index = context.state.stepIds.findLastIndex(candidateId => {
        const candidate = context.state.steps[candidateId];
        if (candidate.type === 'exit') {
          return true;
        }
      });
      context.state.stepIds.splice(index, 0, stepId);
      context.state.steps[stepId] = { stepId, type: 'coverage', coverageId: coverageId, status: 'waiting' };
      context.state.coverages[coverageId] = data;
      const childrenIndex = context.state.children.length;
      context.state.children.splice(childrenIndex, 0, { type: 'coverage', coverageId });
    }
  }

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
        case 'coverage':
          XTestRoot.registerCoverage(context, data);
          break;
        default:
          throw new Error(`Unexpected registration type "${data.type}".`);
      }
    }
  }

  static onReady(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      const only = (
        Object.values(context.state.its).some(candidate => {
          return candidate.only && candidate.parents[0].testId === data.testId;
        }) ||
        Object.values(context.state.describes).some(candidate => {
          return candidate.only && candidate.parents[0].testId === data.testId;
        })
      );
      if (only) {
        for (const it of Object.values(context.state.its)) {
          if (it.parents[0].testId === data.testId) {
            if (!it.only) {
              const describeParents = it.parents
                .filter(candidate => candidate.type === 'describe')
                .map(parent => context.state.describes[parent.describeId]);
              const hasOnlyDescribeParent = describeParents.some(candidate => candidate.only);
              if (!hasOnlyDescribeParent) {
                it.directive = 'SKIP';
              } else if (!it.directive) {
                const lastDescribeParentWithDirective = describeParents.findLast(candidate => !!candidate.directive);
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
                .filter(candidate => candidate.type === 'describe')
                .map(parent => context.state.describes[parent.describeId]);
              const lastDescribeParentWithDirective = describeParents.findLast(candidate => !!candidate.directive);
              if (lastDescribeParentWithDirective) {
                it.directive = lastDescribeParentWithDirective.directive;
              }
            }
          }
        }
      }
      const stepId = context.state.stepIds.find(candidateId => {
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

  static onResult(context, event) {
    if (!context.state.ended) {
      const data = event.data.data;
      const it = context.state.its[data.itId];
      const stepId = context.state.stepIds.find(candidateId => {
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
      const tap = XTestTap.testLine(ok, number, text, directive, level);
      if (!data.error) {
        XTestRoot.output(context, stepId, tap);
      } else {
         const yaml = XTestRoot.yaml(context, stepId);
         const errorTap = XTestTap.yaml(yaml.message, yaml.severity, yaml.data, level);
         XTestRoot.output(context, stepId, tap, errorTap);
      }
    }
  }

  static onCoverageResult(context, event) {
    if (!context.state.ended) {
      context.state.resolveCoverageValuePromise(event.data.data);
    }
  }

  static kickoffVersion(context, stepId) {
    const tap = XTestTap.version();
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffDescribeStart(context, stepId) {
    const level = XTestRoot.level(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const tap = XTestTap.subtest(text, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffDescribePlan(context, stepId) {
    const level = XTestRoot.level(context, stepId);
    const count = XTestRoot.count(context, stepId);
    const tap = XTestTap.plan(count, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffDescribeEnd(context, stepId) {
    const number = XTestRoot.number(context, stepId);
    const ok = XTestRoot.ok(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffTestStart(context, stepId) {
    // Destroy prior test. This keeps the final test around for debugging.
    const lastIframe = document.querySelector('iframe');
    lastIframe?.remove();
    // Create the new test.
    const step = context.state.steps[stepId];
    const href = XTestRoot.href(context, stepId);
    const iframe = document.createElement('iframe');
    iframe.addEventListener('error', () => {
      const error = new Error(`Failed to load ${href}`);
      XTestRoot.bail(context, error);
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

  static kickoffTestPlan(context, stepId) {
    const count = XTestRoot.count(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.plan(count, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffTestEnd(context, stepId) {
    const number = XTestRoot.number(context, stepId);
    const ok = XTestRoot.ok(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive, level);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
  }

  static kickoffIt(context, stepId) {
    const step = context.state.steps[stepId];
    const { itId, directive, interval } = context.state.its[step.itId];
    context.publish('x-test-root-run', { itId, directive, interval });
    step.status = 'running';
  }

  static kickoffCoverage(context, stepId) {
    const step = context.state.steps[stepId];
    const coverage = context.state.coverages[step.coverageId];
    if (context.state.coverageValue) {
      try {
        const analysis = XTestRoot.analyzeHrefCoverage(context.state.coverageValue.js, coverage.href, coverage.goal);
        Object.assign(coverage, { ok: analysis.ok, percent: analysis.percent, output: analysis.output });
      } catch (error) {
        Object.assign(coverage, { ok: false, percent: 0, output: '' });
        XTestRoot.bail(context, error);
      }
    } else {
      Object.assign(coverage, { ok: true, percent: 0, output: '', directive: 'SKIP' });
    }
    const ok = XTestRoot.ok(context, stepId);
    const number = XTestRoot.number(context, stepId);
    const text = XTestRoot.text(context, stepId);
    const directive = XTestRoot.directive(context, stepId);
    const level = XTestRoot.level(context, stepId);
    const tap = XTestTap.testLine(ok, number, text, directive, level);
    if (!ok) {
      const errorTap = XTestTap.diagnostic(coverage.output, level);
      XTestRoot.output(context, stepId, tap, errorTap);
    } else {
      XTestRoot.output(context, stepId, tap);
    }
    step.status = 'done';
  }

  static kickoffExit(context, stepId) {
    const count = XTestRoot.count(context, stepId);
    const tap = XTestTap.plan(count);
    XTestRoot.output(context, stepId, tap);
    context.state.steps[stepId].status = 'done';
    XTestRoot.end(context);
  }

  static requestCoverageValue(context) {
    context.state.waiting = true;
    Promise.race([context.state.coverageValuePromise, context.timeout(5000)])
      .then(() => { XTestRoot.check(context); })
      .catch(error => { XTestRoot.bail(context, error); });
    context.publish('x-test-root-coverage-request');
  }

  static check(context) {
    if (!context.state.ended) {
      // Look to see if any tests are running.
      const runningStepId = context.state.stepIds.find(candidateId => {
        return context.state.steps[candidateId].status === 'running';
      });
      if (!runningStepId) {
        // If nothing's running, find the first step that's waiting and run that.
        const stepId = context.state.stepIds.find(candidateId => {
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
            case 'coverage':
              if (!context.state.coverage || context.state.coverageValue) {
                XTestRoot.kickoffCoverage(context, stepId);
                XTestRoot.check(context);
              } else if (!context.state.waiting) {
                XTestRoot.requestCoverageValue(context);
              }
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

  static log(context, ...tap) {
    for (const line of tap) {
      console.log(line); // eslint-disable-line no-console
    }
    context.state.reporter?.tap(...tap);
  }

  static output(context, stepId, ...stepTap) {
    const lastIndex = context.state.stepIds.findIndex(candidateId => {
      const candidate = context.state.steps[candidateId];
      return !candidate.tap;
    });
    context.state.steps[stepId].tap = stepTap;
    const index = context.state.stepIds.findIndex(candidateId => {
      const candidate = context.state.steps[candidateId];
      return !candidate.tap;
    });
    if (lastIndex !== index) {
      let tap;
      if (index === -1) {
        // We're done!
        tap = context.state.stepIds.slice(lastIndex).map(targetId => context.state.steps[targetId].tap);
      } else {
        tap = context.state.stepIds.slice(lastIndex, index).map(targetId => context.state.steps[targetId].tap);
      }
      if (context.state.filtering) {
        XTestRoot.handleFilteredOutput(context, tap.flat(), stepId);
      } else {
        XTestRoot.log(context, ...tap.flat());
      }
    }
  }

  static handleFilteredOutput(context, tap, stepId) {
    const step = context.state.steps[stepId];

    // Start queueing when we encounter a subtest
    if (step.type === 'describe-start' || step.type === 'test-start') {
      context.state.queueing = true;
    }

    // Handle empty test plans by removing back to matching subtest and suppressing the plan
    if ((step.type === 'describe-plan' || step.type === 'test-plan') && XTestRoot.count(context, stepId) === 0) {
      // Find the matching subtest line in the queue and remove everything from there
      const subtestIndex = context.state.queue.findLastIndex(line => 
        line.trim().startsWith('# Subtest:')
      );
      if (subtestIndex === -1) {
        throw new Error('Expected to find matching subtest in queue for empty plan');
      }
      context.state.queue.length = subtestIndex;
      // Don't add the empty plan line to the queue - just return early
      return;
    }

    // Handle empty describe-end by removing from parent and suppressing the test line
    if (step.type === 'describe-end') {
      const describe = context.state.describes[step.describeId];
      if (describe.children.length === 0) {
        // This describe block is empty, remove it from its parent's children
        const parentType = describe.parents.at(-1)?.type;
        if (parentType === 'describe') {
          const parentDescribe = context.state.describes[describe.parents.at(-1).describeId];
          const childIndex = parentDescribe.children.findIndex(child => 
            child.type === 'describe' && child.describeId === describe.describeId
          );
          if (childIndex !== -1) {
            parentDescribe.children.splice(childIndex, 1);
          }
        } else if (parentType === 'test') {
          const parentTest = context.state.tests[describe.parents.at(-1).testId];
          const childIndex = parentTest.children.findIndex(child => 
            child.type === 'describe' && child.describeId === describe.describeId
          );
          if (childIndex !== -1) {
            parentTest.children.splice(childIndex, 1);
          }
        }
        // Don't output the test line
        return;
      }
    }

    // Handle empty test-end by removing from parent and suppressing the test line
    if (step.type === 'test-end') {
      const test = context.state.tests[step.testId];
      if (test.children.length === 0) {
        // This test suite is empty, remove it from children array
        const childIndex = context.state.children.findIndex(child => 
          child.type === 'test' && child.testId === test.testId
        );
        if (childIndex !== -1) {
          context.state.children.splice(childIndex, 1);
        }
        // Don't output the test line
        return;
      }
    }

    // Suppress coverage test lines when filtering
    if (step.type === 'coverage') {
      // Remove coverage from children array
      const childIndex = context.state.children.findIndex(child => 
        child.type === 'coverage' && child.coverageId === step.coverageId
      );
      if (childIndex !== -1) {
        context.state.children.splice(childIndex, 1);
      }
      // Don't output the coverage test line
      return;
    }

    // Always allow version and exit to go through normal flow
    if (step.type === 'version' || step.type === 'exit') {
      // Flush any remaining queued output before exit
      if (step.type === 'exit' && context.state.queue.length > 0) {
        XTestRoot.log(context, ...context.state.queue);
        context.state.queue.length = 0;
        context.state.queueing = false;
      }
      // These steps should not be queued - let them go through normal output flow
      XTestRoot.log(context, ...tap);
      return;
    }

    // If queueing, add to queue instead of outputting
    if (context.state.queueing) {
      context.state.queue.push(...tap);

      // Flush queue and stop queueing when we encounter a test line
      if (step.type === 'it' || step.type === 'describe-end' || step.type === 'test-end') {
        context.state.queueing = false;
        XTestRoot.log(context, ...context.state.queue);
        context.state.queue.length = 0;
      }
    } else {
      // Not queueing, output normally
      XTestRoot.log(context, ...tap);
    }
  }

  static childOk(context, child, options) {
    switch (child.type) {
      case 'test':
        return context.state.tests[child.testId].children.every(candidate => XTestRoot.childOk(context, candidate, options));
      case 'describe':
        return context.state.describes[child.describeId].children.every(candidate => XTestRoot.childOk(context, candidate, options));
      case 'it':
        return context.state.its[child.itId].ok || options?.todoOk && context.state.its[child.itId].directive === 'TODO';
      case 'coverage':
        return context.state.coverages[child.coverageId].ok;
      default:
        throw new Error(`Unexpected type "${child.type}".`);
    }
  }

  static ok(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-end':
        return XTestRoot.childOk(context, { type: 'test', testId: step.testId }, { todoOk: true });
      case 'describe-end':
        return XTestRoot.childOk(context, { type: 'describe', describeId: step.describeId }, { todoOk: true });
      case 'it':
        return XTestRoot.childOk(context, { type: 'it', itId: step.itId });
      case 'coverage':
        return XTestRoot.childOk(context, { type: 'coverage', coverageId: step.coverageId });
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static number(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'it': {
        const it = context.state.its[step.itId];
        const parentChildren = it.parents.at(-1)?.type === 'describe'
          ? context.state.describes[it.parents.at(-1).describeId].children
          : context.state.tests[it.parents.at(-1).testId].children;
        const index = parentChildren.findIndex(candidate => candidate.itId === it.itId);
        return index + 1;
      }
      case 'describe-end': {
        const describe = context.state.describes[step.describeId];
        const parentChildren = describe.parents.at(-1)?.type === 'describe'
          ? context.state.describes[describe.parents.at(-1).describeId].children
          : context.state.tests[describe.parents.at(-1).testId].children;
        const index = parentChildren.findIndex(candidate => candidate.describeId === describe.describeId);
        return index + 1;
      }
      case 'test-end': {
        const test = context.state.tests[step.testId];
        const index = context.state.children.findIndex(candidate => candidate.testId === test.testId);
        return index + 1;
      }
      case 'coverage': {
        const coverage = context.state.coverages[step.coverageId];
        const index = context.state.children.findIndex(candidate => candidate.coverageId === coverage.coverageId);
        return index + 1;
      }
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

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
      case 'coverage': {
        const coverage = context.state.coverages[step.coverageId];
        return `${coverage.goal}% coverage goal for ${coverage.href} (got ${coverage.percent.toFixed(2)}%)`;
      }
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

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

  static directive(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'describe-end':
      case 'test-end':
        return null;
      case 'it':
        return context.state.its[step.itId].directive;
      case 'coverage':
        return context.state.coverages[step.coverageId].directive;
      default:
        throw new Error(`Unexpected type "${step.type}".`);
    }
  }

  static level(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'test-plan':
        return 1;
      case 'test-start':
      case 'test-end':
      case 'coverage':
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

  static yaml(context, stepId) {
    const step = context.state.steps[stepId];
    switch (step.type) {
      case 'it': {
        const it = context.state.its[step.itId];
        const { ok, directive, error } = it;
        const yaml = { message: 'ok', severity: 'comment', data: {} };
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

  static end(context) {
    context.state.ended = true;
    context.state.waiting = false;
    context.publish('x-test-root-end');
  }

  static analyzeHrefCoverage(coverageValue, href, goal) {
    const set = new Set();
    let text = '';
    for (const item of coverageValue ?? []) {
      if (item.url === href) {
        text = item.text;
        for (const range of item.ranges) {
          for (let i = range.start; i < range.end; i++) {
            set.add(i);
          }
        }
      }
    }
    const ranges = [];
    const state = { used: set.has(0), start: 0 };
    for (let index = 0; index < text.length; index++) {
      const used = set.has(index);
      if (used !== state.used) {
        ranges.push({ used: state.used, start: state.start, end: index });
        Object.assign(state, { used, start: index });
      }
    }
    ranges.push({ used: state.used, start: state.start, end: text.length });
    let output = '';
    let lineNumber = 1;
    for (const range of ranges) {
      let lines = text
        .slice(range.start, range.end)
        .split('\n')
        .map((line, iii) => lineNumber === 1 || iii > 0 ? `${String(lineNumber++ + (range.used ? '' : ' !')).padEnd(8, ' ')}|  ${line}` : line);
      if (range.used) {
        if (lines.length > 3) {
          lines = [...lines.slice(0, 1), '\u2026', ...lines.slice(-1)];
        }
      } else {
        if (lines.length > 5) {
          lines = [...lines.slice(0, 2), '\u2026', ...lines.slice(-2)];
        }
      }
      output += range.used ? `${lines.join('\n')}` : `${lines.join('\n')}`;
    }
    const percent = set.size / text.length * 100;
    const ok = percent >= goal;
    return { ok, percent, output };
  }
}
