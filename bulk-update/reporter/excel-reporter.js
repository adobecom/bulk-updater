import xlsx from 'xlsx';
import * as fs from 'fs';
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
   */
  constructor(filepath, autoSave = true) {
    super();
    this.filepath = filepath;
    this.autoSave = autoSave;
    this.workbook = xlsx.utils.book_new();
    const totalsSheet = xlsx.utils.aoa_to_sheet([['Topic', 'Status', 'Count']]);
    xlsx.utils.book_append_sheet(this.workbook, totalsSheet, 'Totals');
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
     */
  log(topic, status, message, ...args) {
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
    let sheet = this.workbook.Sheets[sheetName];
    if (!sheet) {
      sheet = xlsx.utils.aoa_to_sheet([header]);
      xlsx.utils.book_append_sheet(this.workbook, sheet, sheetName);
    }

    const range = xlsx.utils.decode_range(sheet['!ref']);
    const newRow = range.e.r + 1;

    log.forEach((item, index) => {
      const newCell = xlsx.utils.encode_cell({ r: newRow, c: index });
      sheet[newCell] = { v: item };
    });

    sheet['!ref'] = xlsx.utils.encode_range({ s: range.s, e: { r: newRow, c: log.length - 1 } });

    if (this.autoSave) this.saveReport();
  }

  /**
     * Updates the totals sheet for each topic and status.
     * @returns {Object} - The totals object.
     */
  generateTotals() {
    const totals = super.generateTotals();
    const totalsSheet = this.workbook.Sheets.Totals;
    const data = [];
    Object.entries(totals).forEach(([topic, statusCount]) => {
      Object.entries(statusCount).forEach(([status, count]) => {
        data.push([topic, status, count]);
      });
    });
    xlsx.utils.sheet_add_aoa(totalsSheet, data, { origin: 'A2' });
    if (!this.filepath) return totals;
    try {
      this.saveReport();
      console.log(`Report saved to ${this.filepath}`);
    } catch (e) {
      console.error(`Error saving report to ${this.filepath}: ${e.message}`);
    }

    return totals;
  }

  /**
   * Saves the generated report to the specified filepath.
   */
  saveReport() {
    if (!this.filepath) return;
    const directoryPath = this.filepath.split('/').slice(0, -1).join('/');
    fs.mkdirSync(directoryPath, { recursive: true });
    xlsx.set_fs(fs);
    xlsx.writeFile(this.workbook, this.filepath);
  }
}

export default ExcelReporter;
