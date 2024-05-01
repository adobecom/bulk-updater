import * as fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import BaseReporter from './reporter.js';

/**
 * ExcelReporter class extending BaseReporter and logging to an Excel report file.
 *
 * @extends BaseReporter
 */
class ExcelReporter extends BaseReporter {
  /**
   * Creates a new instance of the ExcelReporter class.
   *
   * @param {string} filepath - The file path where the Excel file will be saved.
   * @param {boolean} [autoSave=true] - Excel file should be automatically saved when logging.
   * Disable to improve performance. Don't forget to call `saveReport` when done.
   */
  constructor(filepath, autoSave = true) {
    super();
    this.filepath = filepath;
    this.autoSave = autoSave;
    this.workbook = new ExcelJS.Workbook();
    const totalsSheet = this.workbook.addWorksheet('Totals');
    totalsSheet.addRow(['Topic', 'Status', 'Count']);
  }

  /**
   * Get date string in the format of YYYY-MM-DD_HH-MM for file naming.
   *
   * @returns {string} - date string
   */
  static getDateString(date = new Date()) {
    return date.toLocaleString('en-US', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .replace(/\/|,|:| /g, '-')
      .replace('--', '_');
  }

  /**
     * Logs a message with the specified topic, status, message, and additional arguments.
     *
     * @param {string} topic - The topic of the log message.
     * @param {string} status - The status of the log message.
     * @param {string} message - The log message.
     * @param {...any} args - Additional arguments to be included in the log.
     * @returns {Promise<void>} - A promise that resolves when the log is complete.
     */
  async log(topic, status, message, ...args) {
    const header = ['Status', 'Message'];
    const log = [status, message];
    args.forEach((arg) => {
      if (typeof arg === 'object' && !Array.isArray(arg)) {
        Object.entries(arg).forEach(([key, value]) => {
          header.push(key);
          log.push(value);
        });
      } else if (Array.isArray(arg)) {
        log.push(...arg);
      } else {
        log.push(arg);
      }
    });
    super.log(topic, status, message, ...args);

    const sheetName = topic || 'Uncategorized';
    let sheet = this.workbook.getWorksheet(sheetName);

    if (!sheet) {
      sheet = this.workbook.addWorksheet(sheetName);
      sheet.addRow(header);
    }

    if (sheet.getRow(1).values.length - 1 < header.length) {
      header.forEach((item, index) => {
        if (!sheet.getRow(1).getCell(index + 1).value) {
          sheet.getRow(1).getCell(index + 1).value = item;
        }
      });
    }

    const newRow = sheet.rowCount + 1;

    log.forEach((item, index) => {
      sheet.getRow(newRow).getCell(index + 1).value = item;
    });

    if (this.autoSave) {
      await this.saveReport();
    }
  }

  /**
     * Updates the totals sheet for each topic and status.
     * @returns {Object} - The totals object.
     */
  async generateTotals() {
    const totals = super.generateTotals();
    const totalsSheet = this.workbook.getWorksheet('Totals');
    const data = Object.entries(totals)
      .flatMap(([topic, statusCount]) => Object.entries(statusCount)
        .map(([status, count]) => [topic, status, count]));

    data.forEach((row) => {
      totalsSheet.addRow(row);
    });

    try {
      await this.saveReport();
      console.log(`Report saved to ${this.filepath}`);
    } catch (e) {
      console.error(`Error saving report to ${this.filepath}: ${e.message}`);
    }

    return totals;
  }

  /**
   * Saves the generated report to the specified filepath.
   */
  async saveReport() {
    if (!this.filepath) return;
    const directoryPath = path.dirname(this.filepath);
    fs.mkdirSync(directoryPath, { recursive: true });
    await this.workbook.xlsx.writeFile(this.filepath);
  }
}

export default ExcelReporter;
