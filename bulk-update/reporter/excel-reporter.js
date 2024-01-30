import xlsx from 'xlsx';
import * as fs from 'fs';
import BaseReporter from './reporter.js';

/**
 * ExcelReporter class extending BaseReporter and logging to an XLSX file.
 */
class ExcelReporter extends BaseReporter {
  constructor(filepath) {
    super();
    this.filepath = filepath;
    this.workbook = xlsx.utils.book_new();
    const totalsSheet = xlsx.utils.aoa_to_sheet([['Topic', 'Status', 'Count']]);
    xlsx.utils.book_append_sheet(this.workbook, totalsSheet, 'Totals');

    this.saveReport();
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

    const sheetName = topic || 'Uncategorized';
    let sheet = this.workbook.Sheets[sheetName];
    if (!sheet) {
      sheet = xlsx.utils.aoa_to_sheet([['Status', 'Message']]);
      xlsx.utils.book_append_sheet(this.workbook, sheet, sheetName);
    }

    const log = [status, message, ...args];
    const range = xlsx.utils.decode_range(sheet['!ref']);
    const newRow = range.e.r + 1;

    log.forEach((item, index) => {
      const newCell = xlsx.utils.encode_cell({ r: newRow, c: index });
      sheet[newCell] = { v: item };
    });

    sheet['!ref'] = xlsx.utils.encode_range({ s: range.s, e: { r: newRow, c: log.length - 1 } });

    this.saveReport();
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
    if (this.filepath) {
      const directoryPath = this.filepath.split('/').slice(0, -1).join('/');
      fs.mkdirSync(directoryPath, { recursive: true });
      xlsx.set_fs(fs);
      xlsx.writeFile(this.workbook, this.filepath);
    }
  }
}

export default ExcelReporter;
