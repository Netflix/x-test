export class XTestTap {
  /**
   * @param {number} [level]
   * @returns {string}
   */
  static level(level) {
    level = level ?? 0;
    return '    '.repeat(level);
  }

  /**
   * @returns {string}
   */
  static version() {
    return 'TAP Version 14';
  }

  /**
   * @param {string} message
   * @param {number} [level]
   * @returns {string}
   */
  static diagnostic(message, level) {
    return `${XTestTap.level(level)}# ${message.replace(/\n/g, `\n${XTestTap.level(level)}# `)}`;
  }

  /**
   * @param {boolean} ok
   * @param {number} number
   * @param {string} description
   * @param {string} [directive]
   * @param {number} [level]
   * @returns {string}
   */
  static testLine(ok, number, description, directive, level) {
    description = description.replace(/\n/g, ' ');
    const okText = ok ? 'ok' : 'not ok';
    const directiveText = directive ? ` # ${directive}` : '';
    return `${XTestTap.level(level)}${okText} ${number} - ${description}${directiveText}`;
  }

  /**
   * @param {string} name
   * @param {number} [level]
   * @returns {string}
   */
  static subtest(name, level) {
    const text = `${XTestTap.level(level)}# Subtest: ${name}`;
    return text;
  }

  /**
   * @param {string} message
   * @param {string} severity
   * @param {any} data
   * @param {number} [level]
   * @returns {string}
   */
  static yaml(message, severity, data, level) {
    let text = `${XTestTap.level(level)}  ---`;
    text += `\n${XTestTap.level(level)}  message: ${message.replace(/\n/g, ' ')}`;
    text += `\n${XTestTap.level(level)}  severity: ${severity}`;
    if (data && data.stack) {
      text += `\n${XTestTap.level(level)}  stack: |-`;
      text += `\n${XTestTap.level(level)}    ${data.stack.replace(/\n/g, `\n${XTestTap.level(level)}    `)}`;
    }
    text += `\n${XTestTap.level(level)}  ...`;
    return text;
  }

  /**
   * @param {string} [message]
   * @returns {string}
   */
  static bailOut(message) {
    return message ? `Bail out! ${message.replace(/\n/g, ` `)}` : 'Bail out!';
  }

  /**
   * @param {number} number
   * @param {number} [level]
   * @returns {string}
   */
  static plan(number, level) {
    return `${XTestTap.level(level)}1..${number}`;
  }
}
