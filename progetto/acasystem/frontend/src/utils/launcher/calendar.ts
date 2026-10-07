/**
 * Date and clock texts of the cover (UI-008 adapted): Italian locale, weeks from Monday,
 * sentence case. The month grid logic follows the reference; the code is new.
 */

const LOCALE = 'it-IT';

const sentence = (text: string) =>
  text ? text.charAt(0).toLocaleUpperCase(LOCALE) + text.slice(1) : text;

export interface CoverDate {
  /** «Martedì» */
  weekday: string;
  /** «Ottobre» */
  month: string;
  day: number;
  year: number;
  /** Machine-readable date (YYYY-MM-DD) for <time>. */
  iso: string;
  /** «martedì 6 ottobre 2026», for assistive technologies. */
  spoken: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function coverDate(date: Date): CoverDate {
  const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(date);
  const month = new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(date);
  const spoken = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return {
    weekday: sentence(weekday),
    month: sentence(month),
    day: date.getDate(),
    year: date.getFullYear(),
    iso: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    spoken,
  };
}

export interface ClockText {
  /** «14:05» */
  short: string;
  /** «14:05:32» */
  long: string;
  /** Machine-readable time (HH:MM:SS). */
  iso: string;
}

export function clockText(date: Date): ClockText {
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return { short: `${hh}:${mm}`, long: `${hh}:${mm}:${ss}`, iso: `${hh}:${mm}:${ss}` };
}

/** Column headers of the month grid, Monday first: initial and full name. */
export const WEEKDAYS: ReadonlyArray<{ initial: string; name: string }> = [
  { initial: 'L', name: 'Lunedì' },
  { initial: 'M', name: 'Martedì' },
  { initial: 'M', name: 'Mercoledì' },
  { initial: 'G', name: 'Giovedì' },
  { initial: 'V', name: 'Venerdì' },
  { initial: 'S', name: 'Sabato' },
  { initial: 'D', name: 'Domenica' },
];

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Weeks of the month, Monday first; empty cells are null. 4 to 6 rows. */
export function monthMatrix(year: number, month: number): Array<Array<number | null>> {
  const first = new Date(year, month, 1).getDay(); // 0 = Sunday
  const offset = (first + 6) % 7; // 0 = Monday
  const total = daysInMonth(year, month);
  const weeks: Array<Array<number | null>> = [];
  let day = 1 - offset;
  while (day <= total) {
    const week: Array<number | null> = [];
    for (let column = 0; column < 7; column += 1) {
      week.push(day >= 1 && day <= total ? day : null);
      day += 1;
    }
    weeks.push(week);
  }
  return weeks;
}
