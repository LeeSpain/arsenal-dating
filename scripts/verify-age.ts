// Boundary tests for the 18+ gate logic. Run:
//   node --experimental-strip-types scripts/verify-age.ts
import assert from 'node:assert';

import { computeAge, isAdult, parseDob, toIsoDate } from '../src/lib/age.ts';

function dobYearsAgo(years: number, extraDays = 0): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + extraDays);
  return d;
}

let passed = 0;
function check(name: string, cond: boolean) {
  assert.ok(cond, 'FAILED: ' + name);
  console.log('  ✓ ' + name);
  passed++;
}

// --- the boundary that matters ---
check('exactly 18 today -> adult', isAdult(dobYearsAgo(18, 0)) === true);
check('18th birthday is tomorrow -> NOT adult', isAdult(dobYearsAgo(18, 1)) === false);
check('17 years old -> NOT adult', isAdult(dobYearsAgo(17)) === false);
check('25 years old -> adult', isAdult(dobYearsAgo(25)) === true);
check('computeAge of a 25yo is 25', computeAge(dobYearsAgo(25)) === 25);

// --- date validation ---
check('valid leap date (2000-02-29) parses', parseDob(2000, 2, 29) instanceof Date);
check('non-leap 2001-02-29 rejected', parseDob(2001, 2, 29) === null);
check('month 13 rejected', parseDob(2000, 13, 1) === null);
check('day 0 rejected', parseDob(2000, 1, 0) === null);
check('future year rejected', parseDob(new Date().getFullYear() + 1, 1, 1) === null);
check('year < 1900 rejected', parseDob(1800, 1, 1) === null);
check('toIsoDate has no TZ shift', toIsoDate(new Date(2000, 0, 5)) === '2000-01-05');

console.log('\nAll ' + passed + ' age checks passed.');
