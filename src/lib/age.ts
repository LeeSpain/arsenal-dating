// Age helpers for the 18+ gate. Pure functions so they're trivially testable
// and identical on every platform.

export const ADULT_AGE = 18;

/** Whole years between dob and `now`. */
export function computeAge(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAdult(dob: Date, now: Date = new Date()): boolean {
  return computeAge(dob, now) >= ADULT_AGE;
}

/**
 * Build a Date from day/month/year fields, returning null if the date is invalid
 * (bad ranges, non-existent dates like 31 Feb, future dates, absurdly old).
 */
export function parseDob(year: number, month: number, day: number): Date | null {
  if (![year, month, day].every(Number.isInteger)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  const rolledOver =
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day;
  if (rolledOver) return null;

  if (year < 1900 || date.getTime() > Date.now()) return null;
  return date;
}

/** ISO date (YYYY-MM-DD) for storing dob without a timezone shift. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
