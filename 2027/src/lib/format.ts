const dayFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const shortDayFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const monthFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'UTC',
});

const monthDayFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const monthDayYearFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Tuesday, September 15" — used as schedule day headings. */
export function formatDay(date: Date): string {
  return dayFmt.format(date);
}

/** "Sep 15" — compact form for cards. */
export function formatShortDay(date: Date): string {
  return shortDayFmt.format(date);
}

/**
 * Compact conference date range without repeating shared date parts:
 * "June 7–9, 2027", "June 30–July 2, 2027", or
 * "December 31, 2027–January 2, 2028".
 */
export function formatDateRange(start: Date, end = start): string {
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const sameYear = startYear === endYear;
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const sameDay = sameMonth && start.getUTCDate() === end.getUTCDate();

  if (sameDay) return monthDayYearFmt.format(start);
  if (sameMonth) {
    return `${monthFmt.format(start)} ${start.getUTCDate()}–${end.getUTCDate()}, ${startYear}`;
  }
  if (sameYear) {
    return `${monthDayFmt.format(start)}–${monthDayFmt.format(end)}, ${startYear}`;
  }
  return `${monthDayYearFmt.format(start)}–${monthDayYearFmt.format(end)}`;
}

/** Stable key (YYYY-MM-DD) for grouping sessions by day. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
