'use strict';

/**
 * cronexpr — Parse, validate, and evaluate cron expressions.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 * Zero dependencies.
 */

const FIELD_NAMES = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
const FIELD_RANGES = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 },
};

const MONTH_ALIASES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DOW_ALIASES = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/**
 * Parse a single field into a Set of valid values.
 */
function parseField(field, fieldName) {
  const range = FIELD_RANGES[fieldName];
  const values = new Set();

  for (const part of field.split(',')) {
    let normalized = part.trim().toLowerCase();

    // Resolve aliases
    if (fieldName === 'month') {
      for (const [alias, num] of Object.entries(MONTH_ALIASES)) {
        normalized = normalized.replace(new RegExp(`\\b${alias}\\b`, 'g'), num);
      }
    } else if (fieldName === 'dayOfWeek') {
      for (const [alias, num] of Object.entries(DOW_ALIASES)) {
        normalized = normalized.replace(new RegExp(`\\b${alias}\\b`, 'g'), num);
      }
    }

    // Handle step
    const stepParts = normalized.split('/');
    const base = stepParts[0];
    const step = stepParts[1] ? parseInt(stepParts[1], 10) : 1;

    if (isNaN(step) || step < 1) {
      throw new Error(`Invalid step value in ${fieldName}: ${part}`);
    }

    let start, end;

    if (base === '*') {
      start = range.min;
      end = range.max;
    } else if (base.includes('-')) {
      const [s, e] = base.split('-').map(Number);
      if (isNaN(s) || isNaN(e)) throw new Error(`Invalid range in ${fieldName}: ${part}`);
      start = s;
      end = e;
    } else {
      const n = parseInt(base, 10);
      if (isNaN(n)) throw new Error(`Invalid value in ${fieldName}: ${part}`);
      start = n;
      end = n;
    }

    if (start < range.min || end > range.max) {
      throw new Error(`Value out of range in ${fieldName}: ${part} (expected ${range.min}-${range.max})`);
    }

    for (let i = start; i <= end; i += step) {
      values.add(i);
    }
  }

  if (values.size === 0) {
    throw new Error(`Empty field: ${fieldName}`);
  }

  return values;
}

/**
 * Parse a cron expression string into a structured object.
 */
function parse(expression) {
  if (typeof expression !== 'string') {
    throw new TypeError('Expression must be a string');
  }

  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Expected 5 fields, got ${fields.length}: "${expression}"`);
  }

  const parsed = {};
  for (let i = 0; i < 5; i++) {
    parsed[FIELD_NAMES[i]] = parseField(fields[i], FIELD_NAMES[i]);
  }

  return parsed;
}

/**
 * Validate a cron expression. Returns { valid, error }.
 */
function validate(expression) {
  try {
    parse(expression);
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * Find the next run time at or after `after`.
 */
function nextRun(parsed, after = new Date()) {
  const d = new Date(after.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1); // start from next minute

  const maxIter = 366 * 24 * 60; // ~1 year of minutes
  for (let i = 0; i < maxIter; i++) {
    if (!parsed.month.has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!parsed.dayOfMonth.has(d.getDate())) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!parsed.dayOfWeek.has(d.getDay())) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!parsed.hour.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!parsed.minute.has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
      continue;
    }
    return d;
  }
  return null;
}

/**
 * Get the next N run times.
 */
function nextRuns(expression, count = 5, after = new Date()) {
  const parsed = parse(expression);
  const results = [];
  let cursor = after;

  for (let i = 0; i < count; i++) {
    const next = nextRun(parsed, cursor);
    if (!next) break;
    results.push(next);
    cursor = new Date(next.getTime());
  }

  return results;
}

/**
 * Generate a human-readable description.
 */
function describe(expression) {
  const parsed = parse(expression);
  const fields = expression.trim().split(/\s+/);

  const fmt = (set) => {
    const arr = [...set].sort((a, b) => a - b);
    if (arr.length === 1) return String(arr[0]);
    return arr.join(', ');
  };

  const parts = [];

  // Minute
  if (parsed.minute.size === 60) {
    parts.push('every minute');
  } else if (parsed.minute.size === 1) {
    parts.push(`at minute ${fmt(parsed.minute)}`);
  } else {
    parts.push(`at minutes ${fmt(parsed.minute)}`);
  }

  // Hour
  if (parsed.hour.size !== 24) {
    if (parsed.hour.size === 1) {
      parts[parts.length - 1] += ` past hour ${fmt(parsed.hour)}`;
    } else {
      parts[parts.length - 1] += ` during hours ${fmt(parsed.hour)}`;
    }
  }

  // Day of month
  if (parsed.dayOfMonth.size !== 31) {
    parts.push(`on day(s) ${fmt(parsed.dayOfMonth)} of the month`);
  }

  // Month
  if (parsed.month.size !== 12) {
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const names = [...parsed.month].sort((a, b) => a - b).map(m => monthNames[m]);
    parts.push(`in ${names.join(', ')}`);
  }

  // Day of week
  if (parsed.dayOfWeek.size !== 7) {
    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const names = [...parsed.dayOfWeek].sort((a, b) => a - b).map(d => dowNames[d]);
    parts.push(`on ${names.join(', ')}`);
  }

  return parts.join(', ');
}

module.exports = { parse, validate, nextRun, nextRuns, describe, FIELD_NAMES, FIELD_RANGES };
