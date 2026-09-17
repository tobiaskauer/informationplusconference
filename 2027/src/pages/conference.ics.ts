import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';

export const prerender = true;

const toCalendarDate = (date: Date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

const addUtcDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const escapeCalendarText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

// Calendar lines should stay short; continuation lines begin with one space.
const foldCalendarLine = (line: string) => {
  const chunks = line.match(/.{1,72}/gu) ?? [''];
  return chunks.map((chunk, index) => `${index === 0 ? '' : ' '}${chunk}`).join('\r\n');
};

export const GET: APIRoute = async () => {
  const [settings, homepage] = await Promise.all([
    getEntry('settings', 'home'),
    getEntry('homepageLayout', 'main'),
  ]);

  const start = settings?.data.startDate ?? new Date('2027-06-07T00:00:00.000Z');
  const inclusiveEnd = settings?.data.endDate ?? start;
  // All-day iCalendar events use an exclusive DTEND, hence the extra day.
  const exclusiveEnd = addUtcDays(inclusiveEnd, 1);
  const conferenceName = settings?.data.name?.trim() || 'Information+ 2027';
  const description =
    homepage?.data.hero?.tagline?.trim() ||
    'Information design and data visualization conference.';
  const location = [
    settings?.data.venue?.trim(),
    settings?.data.city?.trim(),
    'Italy',
  ]
    .filter(Boolean)
    .join(', ');
  const year = start.getUTCFullYear();
  const timestamp = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Information Plus//Conference Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:information-plus-${year}@infoplus.team`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${toCalendarDate(start)}`,
    `DTEND;VALUE=DATE:${toCalendarDate(exclusiveEnd)}`,
    `SUMMARY:${escapeCalendarText(conferenceName)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(foldCalendarLine)
    .join('\r\n');

  return new Response(`${calendar}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="information-plus-${year}.ics"`,
    },
  });
};
