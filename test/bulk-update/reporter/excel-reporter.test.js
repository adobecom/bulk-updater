import { expect } from '@esm-bundle/chai';
import fs from 'fs';
import xlsx from 'xlsx';
import sinon from 'sinon';
import ExcelReporter from '../../../bulk-update/reporter/excel-reporter.js';

const { pathname } = new URL('.', import.meta.url);

const deleteObjectProperty = (obj, prop) => Object.keys(obj).forEach((key) => {
  delete obj[key][prop];
});

describe('ExcelReporter', () => {
  describe('Check sheets js library is called', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.spy(xlsx.utils);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should create a new workbook', () => {
      const reporter = new ExcelReporter();

      expect(reporter).is.not.undefined;
      expect(xlsx.utils.book_new.calledOnce).to.be.true;
    });

    it('should append log to sheet', () => {
      const reporter = new ExcelReporter();

      reporter.log('topic', 'status', 'message', 'arg1', 'arg2');

      expect(xlsx.utils.book_append_sheet.calledTwice).to.be.true;
    });
  });

  describe('Check report', () => {
    it('should log a message', () => {
      const reporter = new ExcelReporter();

      reporter.log('topic', 'status', 'message', 'arg1', 'arg2');

      const report = reporter.getReport();

      expect(report.logs.topic).to.have.lengthOf(1);
      expect(report.logs.topic[0]).to.deep.equal({
        status: 'status',
        message: 'message',
        0: 'arg1',
        1: 'arg2',
      });
    });

    it('should calculate the totals for each topic and status', () => {
      const reporter = new ExcelReporter();

      reporter.log('topic1', 'status1', 'message1');
      reporter.log('topic1', 'status2', 'message2');
      reporter.log('topic2', 'status1', 'message3');
      reporter.log('topic2', 'status2', 'message4');
      reporter.log('topic2', 'status2', 'message5');

      const totals = reporter.calculateTotals();

      expect(totals).to.deep.equal({
        topic1: {
          status1: 1,
          status2: 1,
        },
        topic2: {
          status1: 1,
          status2: 2,
        },
      });
    });
  });

  describe('Check XLSX file and format', () => {
    const filepath = `${pathname}test.xlsx`;

    it('should initialize with the correct properties', () => {
      const reporter = new ExcelReporter(filepath);

      expect(reporter.filepath).to.equal(filepath);
      expect(reporter.workbook).is.not.undefined;
    });

    it('should save the report to the specified filepath', () => {
      const reporter = new ExcelReporter(filepath);
      reporter.log('topic', 'status', 'message', 'arg1', 'arg2');
      reporter.calculateTotals();

      expect(fs.existsSync(filepath)).to.be.true;

      const workbook = xlsx.readFile(filepath);
      expect(workbook.SheetNames).to.deep.equal(['Totals', 'topic']);
    });

    it('should log a message to xlsx', () => {
      const reporter = new ExcelReporter();

      reporter.log('topic', 'status', 'message', 'arg1', 'arg2');
      expect(reporter.workbook.SheetNames).to.deep.equal(['Totals', 'topic']);

      const topicSheet = reporter.workbook.Sheets.topic;

      deleteObjectProperty(topicSheet, 't');
      expect(topicSheet).to.deep.equal({
        '!ref': 'A1:D2',
        A1: { v: 'Status' },
        B1: { v: 'Message' },
        A2: { v: 'status' },
        B2: { v: 'message' },
        C2: { v: 'arg1' },
        D2: { v: 'arg2' },
      });
    });

    it('should calculate the totals for each topic and status', () => {
      const reporter = new ExcelReporter();

      reporter.log('topic1', 'status1', 'message1');
      reporter.log('topic1', 'status2', 'message2');
      reporter.log('topic2', 'status1', 'message3');
      reporter.log('topic2', 'status2', 'message4');
      reporter.log('topic2', 'status2', 'message5');

      reporter.calculateTotals();
      const totalsSheet = reporter.workbook.Sheets.Totals;

      deleteObjectProperty(totalsSheet, 't');
      expect(totalsSheet).to.deep.equal({
        '!ref': 'A1:C5',
        A1: { v: 'Topic' },
        B1: { v: 'Status' },
        C1: { v: 'Count' },
        A2: { v: 'topic1' },
        B2: { v: 'status1' },
        C2: { v: 1 },
        A3: { v: 'topic1' },
        B3: { v: 'status2' },
        C3: { v: 1 },
        A4: { v: 'topic2' },
        B4: { v: 'status1' },
        C4: { v: 1 },
        A5: { v: 'topic2' },
        B5: { v: 'status2' },
        C5: { v: 2 },
      });
    });
  });
});
