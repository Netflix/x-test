export class XTestClientCommon {
  static run() {
    return async () => {
      const channel = new BroadcastChannel('x-test');
      return new Promise(resolve => {
        const onMessage = evt => {
          const { type, data } = evt.data;
          if (
            type === 'x-test-root-coverage-request' ||
            type === 'x-test-root-end' ||
            (type === 'x-test-root-pong' && (data.waiting || data.ended))
          ) {
            channel.removeEventListener('message', onMessage);
            channel.close();
            resolve();
          }
        };
        channel.addEventListener('message', onMessage);
        channel.postMessage({ type: 'x-test-client-ping' });
      });
    };
  }

  static cover() {
    return async (data) => {
      const channel = new BroadcastChannel('x-test');
      return new Promise(resolve => {
        const onMessage = evt => {
          const { type } = evt.data;
          if (type === 'x-test-root-end') {
            channel.removeEventListener('message', onMessage);
            channel.close();
            resolve();
          }
        };
        channel.addEventListener('message', onMessage);
        channel.postMessage({ type: 'x-test-client-coverage-result', data });
      });
    };
  }

  static bail(error) {
    // Ensure that we "Bail out!" (see TAP specification) if script fails.
    // The tap stream is being read on stdout.
    console.log('Bail out!'); // eslint-disable-line no-console

    // Ensure we exit with a non-zero code if anything fails (e.g., timeout).
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  }
}
