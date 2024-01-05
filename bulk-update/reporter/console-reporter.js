import BaseReporter from './reporter.js';

/**
 * ConsoleReporter class extending BaseReporter and logging to the console.
 */
class ConsoleReporter extends BaseReporter {
  constructor(consoleObj = console) {
    super();

    this.console = consoleObj;
  }

  /**
     * Logs a message with the specified topic, status, message, and additional arguments.
     *
     * @param {string} topic - The topic of the log message.
     * @param {string} status - The status of the log message.
     * @param {string} message - The log message.
     * @param {...any} args - Additional arguments to be included in the log.
     */
  log(topic, status, message, ...args) {
    super.log(topic, status, message, ...args);

    this.console.log(`${topic} - ${status}: ${message}`, ...args);
  }

  /**
     * Calculates the totals for each topic and status.
     * @returns {Object} - The totals object.
     */
  generateTotals() {
    const totals = super.generateTotals();

    this.console.table(totals);

    return totals;
  }
}

export default ConsoleReporter;
