/**
 * imapflow imports pino for its default logger, which myOS never uses (it
 * passes `logger: false`). The main-process build aliases `pino` here so the
 * logger and its worker-thread transports stay out of the bundle.
 */
const noop = () => undefined;
const logger = { trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop, level: 'silent', child: () => logger };

export default function pino() {
  return logger;
}
