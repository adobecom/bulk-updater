/**
 * BaseReporter class for logging and generating reports.
 */
class BaseReporter {
  constructor() {
    this.logs = {};
  }

  /**
     * Logs a message with the specified topic, status, message, and additional arguments.
     * @param {string} topic - The topic of the log message.
     * @param {string} status - The status of the log message.
     * @param {string} message - The log message.
     * @param {...any} args - Additional arguments to be included in the log.
     */
  log(topic, status, message, ...args) {
    if (!this.logs[topic]) {
      this.logs[topic] = [];
    }

    const logMessage = {
      status,
      message,
      ...args,
    };

    this.logs[topic].push(logMessage);
  }

  /**
     * Calculates the totals for each topic and status.
     * @returns {Object} - The totals object.
     */
  generateTotals() {
    const totals = {};

    Object.keys(this.logs).forEach((topic) => {
      const logs = this.logs[topic];

      const topicTotals = logs.reduce((acc, log) => {
        const { status } = log;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      totals[topic] = topicTotals;
    });

    return totals;
  }

  /**
     * Returns the generated report containing all the logged messages.
     * @returns {Object} - The report object containing the logs.
     */
  getReport() {
    return {
      logs: this.logs,
      totals: this.totals,
    };
  }
}

export default BaseReporter;
