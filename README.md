# cronexpr

Parse and validate cron expressions. Show next run times. Zero deps.

## Why

I kept googling "cron expression validator" and pasting expressions into random websites. Then manually counting "so this runs at... 3am on Tuesdays?" No more. `cronexpr` does it locally, fast, with zero dependencies.

## Install

```bash
npm install cronexpr
```

Or use it globally:

```bash
npm install -g cronexpr
```

## CLI

```bash
# Show next 5 runs
cronexpr "*/5 * * * *"

# Show next 10 runs
cronexpr "0 9 * * 1-5" -n 10

# Human-readable description
cronexpr "0 */2 * * *" --desc
# → every minute at minutes 0 during hours 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22

# Validate only (exit 1 if invalid)
cronexpr "60 * * * *" --validate
# → Invalid cron expression: Value out of range in minute: 60 (expected 0-59)
```

## API

```js
const { parse, validate, nextRuns, describe } = require('cronexpr');

// Parse into field sets
const parsed = parse('0 9 * * mon-fri');
// → { minute: Set{0}, hour: Set{9}, dayOfMonth: Set{1..31}, month: Set{1..12}, dayOfWeek: Set{1,2,3,4,5} }

// Validate
validate('*/5 * * * *'); // { valid: true, error: null }
validate('bad');          // { valid: false, error: 'Expected 5 fields, got 1: "bad"' }

// Next run times
nextRuns('30 4 1 * *', 3); // [Date, Date, Date]

// Human description
describe('0 9 * * 1-5');
// → "at minute 0 past hour 9, on Mon, Tue, Wed, Thu, Fri"
```

## Supported Syntax

Standard 5-field cron: `minute hour day-of-month month day-of-week`

| Field | Range | Aliases |
|-------|-------|---------|
| minute | 0–59 | — |
| hour | 0–23 | — |
| day-of-month | 1–31 | — |
| month | 1–12 | jan–dec |
| day-of-week | 0–6 (Sun–Sat) | sun–sat |

Operators: `*` (any), `,` (list), `-` (range), `/` (step)

Examples:
- `*/5 * * * *` — every 5 minutes
- `0 9 * * mon-fri` — 9am on weekdays
- `30 4 1,15 * *` — 4:30am on 1st and 15th
- `0 0 1 jan,jun *` — midnight on Jan 1 and Jun 1

## License

MIT
