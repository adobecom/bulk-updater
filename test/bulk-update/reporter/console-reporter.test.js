import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import ConsoleReporter from '../../../bulk-update/reporter/console-reporter.js';

describe('ConsoleReporter', () => {
  beforeEach(() => {
    sinon.spy(console, 'log');
    sinon.spy(console, 'table');
  });

  afterEach(() => {
    console.log.restore();
    console.table.restore();
  });

  it('logs a message', () => {
    const reporter = new ConsoleReporter();

    reporter.log('topic', 'status', 'logs message 1', 'arg1', 'arg2');

    expect(console.log.calledOnce).to.be.true;
    expect(console.log.calledWith('topic - status: logs message 1', 'arg1', 'arg2')).to.be.true;
  });

  it('logs multiple messages', () => {
    const reporter = new ConsoleReporter();

    reporter.log('topic', 'status', 'logs multiple message 1', 'arg1', 'arg2');
    reporter.log('topic', 'status', 'logs multiple message 2', 'arg1', 'arg2');

    expect(console.log.calledTwice).to.be.true;
    expect(console.log.calledWith('topic - status: logs multiple message 2', 'arg1', 'arg2')).to.be.true;
  });

  it('calculates the totals for each topic and status', () => {
    const reporter = new ConsoleReporter();

    reporter.log('topic1', 'status1', 'message1');
    reporter.log('topic1', 'status2', 'message2');
    reporter.log('topic2', 'status1', 'message3');
    reporter.log('topic2', 'status2', 'message4');
    reporter.log('topic2', 'status2', 'message5');

    reporter.generateTotals();

    expect(console.table.calledWith({
      topic1: {
        status1: 1,
        status2: 1,
      },
      topic2: {
        status1: 1,
        status2: 2,
      },
    })).to.be.true;
  });
});
