export class XTestTap {
  static level(level) {
    level = level ?? 0;
    return '    '.repeat(level);
  }

  static version() {
    return 'TAP Version 14';
  }

  static diagnostic(message, level) {
    return `${XTestTap.level(level)}# ${message.replace(/\n/g, `\n${XTestTap.level(level)}# `)}`;
  }

  static testLine(ok, number, description, directive, level) {
    description = description.replace(/\n/g, ' ');
    const okText = ok ? 'ok' : 'not ok';
    const directiveText = directive ? ` # ${directive}` : '';
    return `${XTestTap.level(level)}${okText} ${number} - ${description}${directiveText}`;
  }

  static subtest(name, level) {
    const text = `${XTestTap.level(level)}# Subtest: ${name}`;
    return text;
  }

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

  static bailOut(message) {
    return message ? `Bail out! ${message.replace(/\n/g, ` `)}` : 'Bail out!';
  }

  static plan(number, level) {
    return `${XTestTap.level(level)}1..${number}`;
  }
}
