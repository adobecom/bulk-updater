import { expect } from '@esm-bundle/chai';
import fs from 'fs';
import ExcelJS from 'exceljs';
import sinon from 'sinon';
import ExcelReporter from '../../../bulk-update/reporter/excel-reporter.js';

const { pathname } = new URL('.', import.meta.url);

describe('ExcelReporter', () => {
  describe('getDateString', () => {
    it('returns the formatted date string', () => {
      const date = new Date('2024-01-01T12:34:56');
      const expectedDateString = '01-01-2024_12-34';

      const actualDateString = ExcelReporter.getDateString(date);

      expect(actualDateString).to.equal(expectedDateString);
    });
  });

  describe('Check excel js instantiation and methods', () => {
    const sandbox = sinon.createSandbox();

    it('creates a new workbook', () => {
      const reporter = new ExcelReporter();

      expect(reporter).is.not.undefined;
      expect(reporter.workbook).to.be.instanceOf(ExcelJS.Workbook);
    });

    it('initializes with the correct properties', () => {
      const filepath = `${pathname}output/test.xlsx`;
      const reporter = new ExcelReporter(filepath);

      expect(reporter.filepath).to.equal(filepath);
      expect(reporter.workbook).is.not.undefined;
    });

    it('appends log to sheet', () => {
      const reporter = new ExcelReporter();

      sandbox.spy(reporter.workbook);
      reporter.log('topic', 'status', 'message', 'arg1', 'arg2');

      expect(reporter.workbook.addWorksheet.calledOnce).to.be.true;

      sandbox.restore();
    });

    it('appends totals to sheet', async () => {
      const filepath = `${pathname}output/append.xlsx`;
      const reporter = new ExcelReporter(filepath, true);

      sandbox.spy(reporter.workbook);

      reporter.log('topic1', 'status1', 'message1');
      reporter.log('topic1', 'status2', 'message2');
      reporter.log('topic2', 'status1', 'message3');
      reporter.log('topic2', 'status2', 'message4');
      reporter.log('topic2', 'status2', 'message5');

      await reporter.generateTotals();

      expect(reporter.workbook.addWorksheet.callCount).to.equal(2);
      expect(reporter.workbook.getWorksheet('Totals')).is.not.undefined;

      sandbox.restore();
    });

    it('saves the report to the specified filepath', async () => {
      const filepath = `${pathname}output/file.xlsx`;
      const reporter = new ExcelReporter(filepath, false);
      const saveReportSpy = sinon.spy(reporter, 'saveReport');
      await reporter.generateTotals();

      expect(saveReportSpy.calledOnce).to.be.true;

      saveReportSpy.restore();
    });
  });

  describe('Check XLSX file', () => {
    const filepath = `${pathname}output/test.xlsx`;

    before(async () => {
      fs.rmSync(filepath, { force: true });
      const reporter = new ExcelReporter(filepath, false);

      reporter.log('messages', 'status1', 'message1');
      reporter.log('messages', 'status2', 'message2');
      reporter.log('messages', 'status1', 'message3');
      reporter.log('topic', 'count2', 'message');
      reporter.log('topic', 'count2', 'message');
      reporter.log('migration', 'success', 'test', { entry: '/' });
      reporter.log('migration', 'failed', 'test', { entry: '/404' });
      reporter.log('headers', 'one header', 'test', { header: 'test' });
      reporter.log('headers', 'two headers', 'test', { header1: 'test1', header2: 'test2' });

      await reporter.generateTotals();
    });

    it('saves the report to the specified filepath', () => {
      expect(fs.existsSync(filepath)).to.be.true;
    });

    it('all sheet are saved to xlsx', async () => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filepath);

      const messageSheet = workbook.getWorksheet('messages');
      const totalsSheet = workbook.getWorksheet('Totals');
      const topicSheet = workbook.getWorksheet('topic');
      const migrationSheet = workbook.getWorksheet('migration');
      const headersSheet = workbook.getWorksheet('headers');

      expect(messageSheet).is.not.undefined;
      expect(totalsSheet).is.not.undefined;
      expect(topicSheet).is.not.undefined;
      expect(migrationSheet).is.not.undefined;
      expect(headersSheet).is.not.undefined;
    });

    it('each message is saved to xlsx', async () => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filepath);

      const topicSheet = workbook.getWorksheet('messages');
      expect(topicSheet.getCell('A1').value).to.equal('Status');
      expect(topicSheet.getCell('B1').value).to.equal('Message');
      expect(topicSheet.getCell('A2').value).to.equal('status1');
      expect(topicSheet.getCell('B2').value).to.equal('message1');
      expect(topicSheet.getCell('A3').value).to.equal('status2');
      expect(topicSheet.getCell('B3').value).to.equal('message2');
      expect(topicSheet.getCell('A4').value).to.equal('status1');
      expect(topicSheet.getCell('B4').value).to.equal('message3');
    });

    it('new headers are added, but not replaced', async () => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filepath);

      const headersheet = workbook.getWorksheet('headers');

      expect(headersheet.getCell('A1').value).to.equal('Status');
      expect(headersheet.getCell('B1').value).to.equal('Message');
      expect(headersheet.getCell('C1').value).to.equal('header');
      expect(headersheet.getCell('D1').value).to.equal('header2');
    });

    it('totals are saved to xlsx', async () => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filepath);

      const totalsSheet = workbook.getWorksheet('Totals');
      const expectedValues = [
        ['Topic', 'Status', 'Count'],
        ['messages', 'status1', 2],
        ['messages', 'status2', 1],
        ['topic', 'count2', 2],
        ['migration', 'success', 1],
        ['migration', 'failed', 1],
        ['headers', 'one header', 1],
        ['headers', 'two headers', 1],
      ];

      expectedValues.forEach((expectedRow, rowIndex) => {
        expectedRow.forEach((expectedValue, columnIndex) => {
          const cell = totalsSheet.getCell(rowIndex + 1, columnIndex + 1);
          expect(cell.value).to.equal(expectedValue);
        });
      });
    });
  });
});
