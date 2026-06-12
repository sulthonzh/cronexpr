#!/usr/bin/env node
'use strict';

const { validate, nextRuns, describe } = require('./index.js');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
cronexpr — Parse cron expressions, show next run times

Usage:
  cronexpr "*/5 * * * *"           Show next 5 runs
  cronexpr "0 9 * * 1-5" -n 10    Show next 10 runs
  cronexpr "0 */2 * * *" --desc   Human-readable description
  cronexpr "30 4 * * *" --validate  Just validate

Options:
  -n, --count <num>   Number of next runs to show (default: 5)
  --desc              Show human-readable description
  --validate          Only validate, exit 1 if invalid
  -h, --help          Show this help
`);
  process.exit(0);
}

const expr = args[0];
const countIdx = args.indexOf('-n');
const count = countIdx !== -1 && args[countIdx + 1] ? parseInt(args[countIdx + 1], 10) : 5;
const showDesc = args.includes('--desc');
const onlyValidate = args.includes('--validate');

const result = validate(expr);

if (!result.valid) {
  console.error(`Invalid cron expression: ${result.error}`);
  process.exit(1);
}

if (onlyValidate) {
  console.log('✓ Valid cron expression');
  process.exit(0);
}

if (showDesc) {
  console.log(describe(expr));
}

console.log(`\nNext ${count} runs for "${expr}":`);
const runs = nextRuns(expr, count);
for (const d of runs) {
  console.log(`  ${d.toISOString()}`);
}
