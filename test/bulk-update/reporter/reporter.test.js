import { expect } from '@esm-bundle/chai';
import BaseReporter from '../../../bulk-update/reporter/reporter.js';

describe('BaseReporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new BaseReporter();
  });

  it('should initialize with an empty report', () => {
    const report = reporter.getReport();

    expect(report.logs).to.be.an('object').that.is.empty;
  });

  it('should log a message and update the report', () => {
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
