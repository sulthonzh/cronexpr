'use strict';

const { parse, validate, nextRun, nextRuns, describe } = require('./index.js');
let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function assertThrows(fn, msg) {
  try { fn(); failed++; console.error(`  FAIL (no throw): ${msg}`); }
  catch (e) { passed++; }
}

// === parse ===
console.log('parse()');
{
  const p = parse('*/5 * * * *');
  assert(p.minute.has(0) && p.minute.has(5) && p.minute.has(55), '*/5 minute');
  assert(p.hour.size === 24, 'all hours');
  assert(p.month.size === 12, 'all months');
}

{
  const p = parse('0 9 * * 1-5');
  assert(p.minute.has(0) && p.minute.size === 1, 'minute 0');
  assert(p.hour.has(9) && p.hour.size === 1, 'hour 9');
  assert(p.dayOfWeek.has(1) && p.dayOfWeek.has(5) && !p.dayOfWeek.has(0), 'weekday');
}

{
  const p = parse('30 4 1,15 * *');
  assert(p.dayOfMonth.has(1) && p.dayOfMonth.has(15) && p.dayOfMonth.size === 2, 'specific days');
}

// Aliases
{
  const p = parse('0 0 * * mon-fri');
  assert(p.dayOfWeek.has(1) && p.dayOfWeek.has(5), 'dow aliases');
}

{
  const p = parse('0 0 1 jan,jun *');
  assert(p.month.has(1) && p.month.has(6) && p.month.size === 2, 'month aliases');
}

// === validate ===
console.log('validate()');
{
  const v1 = validate('*/5 * * * *');
  assert(v1.valid === true, 'valid expression');
  const v2 = validate('bad');
  assert(v2.valid === false, 'invalid expression');
}

// === error cases ===
console.log('error cases');
assertThrows(() => parse(''), 'empty string throws');
assertThrows(() => parse('* * *'), '3 fields throws');
assertThrows(() => parse('60 * * * *'), 'minute out of range throws');
assertThrows(() => parse('* 24 * * *'), 'hour out of range throws');
assertThrows(() => parse('* * 0 * *'), 'day 0 throws');

// === nextRuns ===
console.log('nextRuns()');
{
  // "every minute" — next 3 should be sequential
  const base = new Date('2026-01-01T00:00:00Z');
  const runs = nextRuns('* * * * *', 3, base);
  assert(runs.length === 3, '3 runs returned');
  assert(runs[0].getTime() === new Date('2026-01-01T00:01:00Z').getTime(), 'first run');
  assert(runs[1].getTime() === new Date('2026-01-01T00:02:00Z').getTime(), 'second run');
  assert(runs[2].getTime() === new Date('2026-01-01T00:03:00Z').getTime(), 'third run');
}

{
  // Specific time
  const base = new Date('2026-01-01T09:00:00Z');
  const runs = nextRuns('30 10 * * *', 2, base);
  assert(runs[0].getHours() === 10 && runs[0].getMinutes() === 30, 'specific hour:minute');
}

{
  // Once a month
  const base = new Date('2026-01-15T00:00:00Z');
  const runs = nextRuns('0 0 1 * *', 2, base);
  assert(runs[0].getDate() === 1, 'runs on 1st');
}

// === describe ===
console.log('describe()');
{
  const d = describe('*/5 * * * *');
  assert(typeof d === 'string' && d.length > 0, 'describe returns string');
}
{
  const d = describe('0 9 * * 1-5');
  assert(d.includes('9'), 'describe includes hour');
  assert(d.includes('Mon') || d.includes('Fri'), 'describe includes weekday');
}

// === Summary ===
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
