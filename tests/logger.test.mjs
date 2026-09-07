import test from 'node:test';
import assert from 'node:assert/strict';

// Node.js ortamında test etmek için logger sınıfının mantığını test ediyoruz
class MockAppLogger {
  constructor() {
    this.logs = [];
    this.breadcrumbs = [];
    this.maxLogs = 100;
    this.maxBreadcrumbs = 10;
  }

  breadcrumb(action) {
    this.breadcrumbs.push(`[${new Date().toISOString()}] ${action}`);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  info(tag, message, details) {
    this.addLog('INFO', tag, message, undefined, details);
  }

  warn(tag, message, details) {
    this.addLog('WARN', tag, message, undefined, details);
  }

  error(tag, message, error, details) {
    const stack = error instanceof Error ? error.stack : undefined;
    this.addLog('ERROR', tag, message, stack, details);
  }

  fatal(tag, message, error, details) {
    const stack = error instanceof Error ? error.stack : undefined;
    this.addLog('FATAL', tag, message, stack, details);
  }

  addLog(level, tag, message, stack, details) {
    const entry = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
      level,
      tag,
      message,
      stack,
      details,
      breadcrumbs: [...this.breadcrumbs],
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs() {
    return [...this.logs].reverse();
  }

  clearLogs() {
    this.logs = [];
    this.breadcrumbs = [];
  }

  exportLogsAsText() {
    if (this.logs.length === 0) return 'Log kaydı bulunmuyor.';
    return this.logs
      .map(l => `[${l.level}] [${l.tag}]: ${l.message}`)
      .join('\n');
  }

  exportLogsAsJSON() {
    return JSON.stringify(this.logs, null, 2);
  }
}

test('AppLogger: records and formats logs with levels correctly', () => {
  const logger = new MockAppLogger();
  logger.info('Auth', 'Kullanıcı giriş yaptı', { user: 'Test' });
  logger.warn('Stock', 'İlaç stoğu azaldı', { remaining: 2 });
  logger.error('Alarm', 'Alarm zamanlanamadı', new Error('Permission denied'));

  const logs = logger.getLogs();
  assert.equal(logs.length, 3);
  assert.equal(logs[0].level, 'ERROR'); // en güncel en başta
  assert.equal(logs[0].tag, 'Alarm');
  assert.match(logs[0].stack, /Permission denied/);
  assert.equal(logs[1].level, 'WARN');
  assert.equal(logs[2].level, 'INFO');
});

test('AppLogger: breadcrumb queue retains at most 10 latest entries', () => {
  const logger = new MockAppLogger();
  for (let i = 1; i <= 15; i++) {
    logger.breadcrumb(`Aksiyon ${i}`);
  }

  assert.equal(logger.breadcrumbs.length, 10);
  assert.match(logger.breadcrumbs[0], /Aksiyon 6/);
  assert.match(logger.breadcrumbs[9], /Aksiyon 15/);

  logger.error('Test', 'Hata oluştu');
  const logs = logger.getLogs();
  assert.equal(logs[0].breadcrumbs.length, 10);
  assert.match(logs[0].breadcrumbs[9], /Aksiyon 15/);
});

test('AppLogger: ring buffer drops oldest logs when exceeding 100 entries', () => {
  const logger = new MockAppLogger();
  for (let i = 1; i <= 110; i++) {
    logger.info('Batch', `Log mesajı ${i}`);
  }

  assert.equal(logger.logs.length, 100);
  // en eski kalan log 11. log olmalı
  assert.equal(logger.logs[0].message, 'Log mesajı 11');
  assert.equal(logger.logs[99].message, 'Log mesajı 110');
});

test('AppLogger: exports text and JSON safely and clears data', () => {
  const logger = new MockAppLogger();
  logger.info('System', 'Sistem başladı');
  
  const textOutput = logger.exportLogsAsText();
  assert.match(textOutput, /\[INFO\] \[System\]: Sistem başladı/);

  const jsonOutput = logger.exportLogsAsJSON();
  const parsed = JSON.parse(jsonOutput);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].message, 'Sistem başladı');

  logger.clearLogs();
  assert.equal(logger.getLogs().length, 0);
  assert.equal(logger.exportLogsAsText(), 'Log kaydı bulunmuyor.');
});
